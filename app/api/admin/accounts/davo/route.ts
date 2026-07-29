// Conturile de admin ale davo.md (`AdminUser`, Postgres partajat).
// Hash-ul parolei nu apare în niciun `select` de aici: nu are ce căuta în UI.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, requireAccountsAccess } from "@/lib/accountsAuth";
import { audit } from "@/lib/accountsAudit";
import {
  ADMIN_SECTION_KEYS,
  ADMIN_SELECT,
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
} from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 8;

export async function GET(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  try {
    const users = await prisma.adminUser.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: ADMIN_SELECT,
    });

    return NextResponse.json({
      success: true,
      // UI-ul dezactivează pe baza lui acțiunile interzise pe propriul cont,
      // înainte să le mai trimită la server.
      meId: guard.actor.id,
      users: users.map(serializeAdmin),
    });
  } catch (error) {
    console.error("accounts/davo GET", error);
    return fail("Nu am putut încărca administratorii", 500);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAccountsAccess(req);
  if (!guard.ok) return guard.res;

  const body = await readBody(req);

  const name = readString(body.name);
  if (!name) return fail("Numele e obligatoriu", 400);

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return fail("Email invalid", 400);

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Parola trebuie să aibă minimum ${MIN_PASSWORD_LENGTH} caractere`, 400);
  }

  // Rolul lipsă înseamnă valoarea implicită din schemă; unul scris greșit e o
  // greșeală de trimis înapoi, nu un „admin" tăcut.
  const role = body.role === undefined ? "admin" : parseAdminRole(body.role);
  if (!role) return fail("Rol necunoscut — acceptate: admin, admin2", 400);

  const permissions =
    body.permissions === undefined
      ? { ok: true as const, value: [] as string[] }
      : parsePermissions(body.permissions, ADMIN_SECTION_KEYS);
  if (!permissions.ok) return fail(permissions.error, 400);

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return fail("Există deja un cont cu acest email", 409);

    const user = await prisma.adminUser.create({
      data: {
        email,
        name,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        role,
        active: true,
        permissions: permissions.value,
      },
      select: ADMIN_SELECT,
    });

    await audit({
      actorEmail: guard.actor.email,
      action: "create",
      system: "davo",
      targetId: user.id,
      targetName: user.email,
      details: { name: user.name, role: user.role, permissions: user.permissions },
      ip: clientIp(req),
    });

    return NextResponse.json({ success: true, user: serializeAdmin(user) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Există deja un cont cu acest email", 409);
    }
    console.error("accounts/davo POST", error);
    return fail("Nu am putut crea contul", 500);
  }
}
