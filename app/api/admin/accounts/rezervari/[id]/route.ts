// Editarea și ștergerea operatorilor.
//
// Actorul e un admin davo, nu un operator, deci aici nu există „nu te bloca pe
// tine". Rămâne însă invariantul panoului de operatori: fără niciun supervizor
// activ, gestiunea lor de acolo devine inaccesibilă.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  auditActionFor,
  BCRYPT_ROUNDS,
  fail,
  OPERATOR_SELECT,
  parsePermissions,
  parseRezervariRole,
  readBody,
  REZERVARI_SECTION_KEYS,
  readString,
  serializeOperator,
} from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PIN_RE = /^\d{4}$/;
const PIN_ERROR = "PIN-ul trebuie să fie 4 cifre";
const LAST_SUPERVISOR_ERROR = "Trebuie să rămână cel puțin un supervizor activ";

async function otherActiveSupervisors(excludeId: string): Promise<number> {
  return prisma.operator.count({
    where: { id: { not: excludeId }, active: true, role: "supervisor" },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;

  try {
    const target = await prisma.operator.findUnique({ where: { id }, select: OPERATOR_SELECT });
    if (!target) return fail("Operatorul nu există", 404);

    const body = await readBody(req);
    const data: { name?: string; pinHash?: string; role?: string; active?: boolean; permissions?: string[] } = {};
    const changed: string[] = [];

    if (body.name !== undefined) {
      const name = readString(body.name);
      if (!name) return fail("Numele e obligatoriu", 400);
      if (name !== target.name) {
        // Slug-ul rămâne cel de la creare: e identificatorul cu care operatorul
        // se autentifică, iar regenerarea lui la redenumire i-ar tăia accesul.
        data.name = name;
        changed.push("name");
      }
    }

    // PIN gol la editare = „nu-l schimba"; formularul îl trimite gol implicit.
    const pin = readString(body.pin);
    if (pin !== "") {
      if (!PIN_RE.test(pin)) return fail(PIN_ERROR, 400);
      data.pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);
      changed.push("pin");
    }

    if (body.role !== undefined) {
      const role = parseRezervariRole(body.role);
      if (!role) return fail("Rol necunoscut — acceptate: operator, supervisor", 400);
      if (role !== target.role) {
        data.role = role;
        changed.push("role");
      }
    }

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") return fail("Starea contului e invalidă", 400);
      if (body.active !== target.active) {
        data.active = body.active;
        changed.push("active");
      }
    }

    if (body.permissions !== undefined) {
      const parsed = parsePermissions(body.permissions, REZERVARI_SECTION_KEYS);
      if (!parsed.ok) return fail(parsed.error, 400);
      const same =
        parsed.value.length === target.permissions.length &&
        parsed.value.every((key) => target.permissions.includes(key));
      if (!same) {
        data.permissions = parsed.value;
        changed.push("permissions");
      }
    }

    if (changed.length === 0) {
      return NextResponse.json({ success: true, operator: serializeOperator(target) });
    }

    const nextRole = data.role ?? target.role;
    const nextActive = data.active ?? target.active;

    // Se compară stările, nu câmpurile: și retrogradarea, și dezactivarea pot
    // lăsa panoul operatorilor fără niciun supervizor care să-l administreze.
    const wasSupervisor = target.active && target.role === "supervisor";
    const staysSupervisor = nextActive && nextRole === "supervisor";
    if (wasSupervisor && !staysSupervisor && (await otherActiveSupervisors(id)) === 0) {
      return fail(LAST_SUPERVISOR_ERROR, 400);
    }

    const operator = await prisma.operator.update({
      where: { id },
      data,
      select: OPERATOR_SELECT,
    });

    await audit({
      actorEmail: guard.actor.email,
      action: auditActionFor(changed, operator.active),
      system: "rezervari",
      targetId: operator.id,
      targetName: `${operator.name} (${operator.slug})`,
      // `changed` conține doar numele câmpurilor — PIN-ul nu ajunge în jurnal.
      details: {
        changed,
        role: operator.role,
        active: operator.active,
        permissions: operator.permissions,
      },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, operator: serializeOperator(operator) });
  } catch (error) {
    console.error("accounts/rezervari/[id] PATCH", error);
    return fail("Nu am putut salva modificările", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;

  try {
    const target = await prisma.operator.findUnique({ where: { id }, select: OPERATOR_SELECT });
    if (!target) return fail("Operatorul nu există", 404);

    // Relația e opțională, deci ștergerea ar trece — dar ar goli `createdById`
    // pe rezervările lui și s-ar pierde tăcut cine le-a făcut.
    if (target._count.bookings > 0) {
      return fail(
        `Operatorul are ${target._count.bookings} rezervări atribuite — dezactivează-l în loc să-l ștergi, ca istoricul să rămână legat de el`,
        409,
      );
    }

    if (target.active && target.role === "supervisor" && (await otherActiveSupervisors(id)) === 0) {
      return fail(LAST_SUPERVISOR_ERROR, 400);
    }

    await prisma.operator.delete({ where: { id } });

    await audit({
      actorEmail: guard.actor.email,
      action: "delete",
      system: "rezervari",
      targetId: target.id,
      targetName: `${target.name} (${target.slug})`,
      details: { role: target.role, permissions: target.permissions },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("accounts/rezervari/[id] DELETE", error);
    return fail("Nu am putut șterge operatorul", 500);
  }
}
