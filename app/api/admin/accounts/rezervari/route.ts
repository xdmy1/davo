// Conturile panoului de operatori (`Operator`) — aceeași bază Postgres,
// gestionată de aici ca să nu fie nevoie de două panouri de administrare.
// PIN-ul e stocat doar ca hash bcrypt, deci nu poate fi arătat înapoi în UI:
// se poate doar înlocui.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  BCRYPT_ROUNDS,
  fail,
  isUniqueViolation,
  OPERATOR_SELECT,
  parsePermissions,
  parseRezervariRole,
  readBody,
  readString,
  REZERVARI_SECTION_KEYS,
  serializeOperator,
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Exact 4 cifre: formularul de login din panoul operatorilor are patru căsuțe. */
const PIN_RE = /^\d{4}$/;
const PIN_ERROR = "PIN-ul trebuie să fie 4 cifre";

/** Identic cu `slugify` din panoul operatorilor — slug-urile trebuie să iasă la fel în ambele repo-uri. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // scoate diacriticele desprinse de NFD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug liber, cu sufix numeric la coliziune: „adrian", „adrian-2", „adrian-3"… */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "operator";
  let slug = base;
  for (let i = 2; await prisma.operator.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function GET(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  try {
    const operators = await prisma.operator.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: OPERATOR_SELECT,
    });

    return NextResponse.json({
      success: true,
      operators: operators.map(serializeOperator),
    });
  } catch (error) {
    console.error("accounts/rezervari GET", error);
    return fail("Nu am putut încărca operatorii", 500);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const body = await readBody(req);

  const name = readString(body.name);
  if (!name) return fail("Numele e obligatoriu", 400);

  const pin = readString(body.pin);
  if (!PIN_RE.test(pin)) return fail(PIN_ERROR, 400);

  const role = body.role === undefined ? "operator" : parseRezervariRole(body.role);
  if (!role) return fail("Rol necunoscut — acceptate: operator, supervisor", 400);

  const permissions =
    body.permissions === undefined
      ? { ok: true as const, value: [] as string[] }
      : parsePermissions(body.permissions, REZERVARI_SECTION_KEYS);
  if (!permissions.ok) return fail(permissions.error, 400);

  try {
    const operator = await prisma.operator.create({
      data: {
        name,
        slug: await uniqueSlug(name),
        // PIN-urile NU trebuie să fie unice: autentificarea e slug + PIN, deci
        // doi operatori cu același PIN nu se încurcă între ei.
        pinHash: await bcrypt.hash(pin, BCRYPT_ROUNDS),
        role,
        active: true,
        permissions: permissions.value,
      },
      select: OPERATOR_SELECT,
    });

    await audit({
      actorEmail: guard.actor.email,
      action: "create",
      system: "rezervari",
      targetId: operator.id,
      targetName: `${operator.name} (${operator.slug})`,
      details: { role: operator.role, permissions: operator.permissions },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, operator: serializeOperator(operator) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // Slug ocupat între verificare și scriere de o cerere paralelă.
      return fail("Există deja un operator cu acest identificator — încearcă din nou", 409);
    }
    console.error("accounts/rezervari POST", error);
    return fail("Nu am putut crea operatorul", 500);
  }
}
