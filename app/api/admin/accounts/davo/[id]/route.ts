// Editarea și ștergerea conturilor de admin davo.md.
//
// Două invarianți se verifică la fiecare mutație:
//   1. nimeni nu-și poate tăia singur craca de sub picioare (ștergere,
//      dezactivare, retrogradare pe propriul cont);
//   2. rămâne mereu cel puțin un admin activ care poate deschide „Conturi &
//      Acces" — altfel panoul se încuie definitiv și repararea cere acces la
//      baza de producție.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import { effectivePermissions, normalizeRole } from "@/lib/permissions";
import {
  ADMIN_SECTION_KEYS,
  ADMIN_SELECT,
  auditActionFor,
  BCRYPT_ROUNDS,
  fail,
  isUniqueViolation,
  isValidEmail,
  normalizeEmail,
  parseAdminRole,
  parsePermissions,
  readBody,
  readString,
  serializeAdmin,
} from "../../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 8;
const ACCOUNTS_KEY = "accounts";
const LAST_KEEPER_ERROR =
  "Trebuie să rămână cel puțin un administrator activ cu acces la „Conturi & Acces”";

type AccountState = { role: string; active: boolean; permissions: string[] };

function canOpenAccounts(user: AccountState): boolean {
  return (
    user.active &&
    effectivePermissions(normalizeRole(user.role), user.permissions).includes(ACCOUNTS_KEY)
  );
}

/** Câți ALȚI admini pot deschide panoul. Zero înseamnă că operația ar încuia secțiunea. */
async function otherAccountsKeepers(excludeId: string): Promise<number> {
  const others = await prisma.adminUser.findMany({
    where: { id: { not: excludeId }, active: true },
    select: { role: true, active: true, permissions: true },
  });
  return others.filter(canOpenAccounts).length;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  const isSelf = id === guard.actor.id;

  try {
    const target = await prisma.adminUser.findUnique({ where: { id }, select: ADMIN_SELECT });
    if (!target) return fail("Contul nu există", 404);

    const body = await readBody(req);
    const data: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      active?: boolean;
      permissions?: string[];
    } = {};
    const changed: string[] = [];

    if (body.name !== undefined) {
      const name = readString(body.name);
      if (!name) return fail("Numele e obligatoriu", 400);
      if (name !== target.name) {
        data.name = name;
        changed.push("name");
      }
    }

    if (body.email !== undefined) {
      const email = normalizeEmail(body.email);
      if (!isValidEmail(email)) return fail("Email invalid", 400);
      if (email !== target.email) {
        const existing = await prisma.adminUser.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existing) return fail("Există deja un cont cu acest email", 409);
        data.email = email;
        changed.push("email");
      }
    }

    // Parola se schimbă doar dacă vine ne-goală: formularul de editare o trimite
    // goală când adminul nu vrea s-o atingă.
    const password = typeof body.password === "string" ? body.password : "";
    if (password !== "") {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return fail(`Parola trebuie să aibă minimum ${MIN_PASSWORD_LENGTH} caractere`, 400);
      }
      data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
      changed.push("password");
    }

    if (body.role !== undefined) {
      const role = parseAdminRole(body.role);
      if (!role) return fail("Rol necunoscut — acceptate: admin, admin2", 400);
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
      const parsed = parsePermissions(body.permissions, ADMIN_SECTION_KEYS);
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
      return NextResponse.json({ success: true, user: serializeAdmin(target) });
    }

    const next: AccountState = {
      role: data.role ?? target.role,
      active: data.active ?? target.active,
      permissions: data.permissions ?? target.permissions,
    };

    if (isSelf) {
      if (data.active === false) {
        return fail("Nu te poți dezactiva pe tine însuți", 400);
      }
      if (normalizeRole(target.role) === "admin" && normalizeRole(next.role) === "admin2") {
        return fail("Nu te poți retrograda pe tine însuți", 400);
      }
      if (!canOpenAccounts(next)) {
        return fail("Nu-ți poți retrage propriul acces la „Conturi & Acces”", 400);
      }
    }

    // Verificarea se face pe starea rezultată, nu pe câmpul modificat: și o
    // schimbare de permisiuni, și una de rol, și dezactivarea pot lăsa panoul
    // fără niciun administrator care să-l mai poată deschide.
    if (canOpenAccounts(target) && !canOpenAccounts(next)) {
      if ((await otherAccountsKeepers(id)) === 0) return fail(LAST_KEEPER_ERROR, 400);
    }

    const user = await prisma.adminUser.update({ where: { id }, data, select: ADMIN_SELECT });

    await audit({
      actorEmail: guard.actor.email,
      action: auditActionFor(changed, next.active),
      system: "davo",
      targetId: user.id,
      targetName: user.email,
      // `changed` conține doar numele câmpurilor — parola nu ajunge în jurnal.
      details: {
        changed,
        role: user.role,
        active: user.active,
        permissions: user.permissions,
      },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, user: serializeAdmin(user) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Există deja un cont cu acest email", 409);
    }
    console.error("accounts/davo/[id] PATCH", error);
    return fail("Nu am putut salva modificările", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const { id } = await params;
  if (id === guard.actor.id) return fail("Nu te poți șterge pe tine însuți", 400);

  try {
    const target = await prisma.adminUser.findUnique({ where: { id }, select: ADMIN_SELECT });
    if (!target) return fail("Contul nu există", 404);

    if (canOpenAccounts(target) && (await otherAccountsKeepers(id)) === 0) {
      return fail(LAST_KEEPER_ERROR, 400);
    }

    await prisma.adminUser.delete({ where: { id } });

    await audit({
      actorEmail: guard.actor.email,
      action: "delete",
      system: "davo",
      targetId: target.id,
      targetName: target.email,
      details: { name: target.name, role: target.role, permissions: target.permissions },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("accounts/davo/[id] DELETE", error);
    return fail("Nu am putut șterge contul", 500);
  }
}
