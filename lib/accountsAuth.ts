// Gardianul comun al rutelor din /api/admin/accounts.
//
// Trei bariere, în ordine: sesiune validă (401) → permisiunea „accounts" (403)
// → token de poartă valid (423). Codul 423 e distinct tocmai ca UI-ul să știe
// că sesiunea e bună și că trebuie doar să reafișeze ecranul cu PIN, nu să
// trimită omul înapoi la login.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/session";
import { effectivePermissions, normalizeRole, type Role } from "@/lib/permissions";
import { GATE_HEADER, verifyGateToken } from "@/lib/accountsGate";

const ACCOUNTS_KEY = "accounts";

export type AccountsActor = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Permisiunile EFECTIVE (lista proprie sau, dacă e goală, presetul rolului). */
  permissions: string[];
};

export type AccountsGuard =
  | { ok: true; actor: AccountsActor }
  | { ok: false; res: NextResponse };

function deny(error: string, status: number, extra?: Record<string, unknown>): AccountsGuard {
  return { ok: false, res: NextResponse.json({ success: false, error, ...extra }, { status }) };
}

/**
 * Sesiune admin validă + cont activ + permisiunea „accounts", FĂRĂ tokenul de
 * poartă. Doar `/unlock` folosește varianta asta — el abia urmează să emită
 * tokenul, deci nu-l poate cere.
 */
export async function requireAccountsSession(req: NextRequest): Promise<AccountsGuard> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return deny("Nu ești autentificat", 401);
  }

  const user = await prisma.adminUser.findUnique({
    where: { email: session.email },
    select: { id: true, email: true, name: true, role: true, active: true, permissions: true },
  });
  if (!user) {
    return deny("Contul nu mai există", 401);
  }
  if (!user.active) {
    // Dezactivarea trebuie să aibă efect imediat, chiar dacă cookie-ul e încă valid.
    return deny("Cont dezactivat", 401);
  }

  const role = normalizeRole(user.role);
  const permissions = effectivePermissions(role, user.permissions);
  if (!permissions.includes(ACCOUNTS_KEY)) {
    return deny("Nu ai acces la secțiunea „Conturi & Acces”", 403);
  }

  return {
    ok: true,
    actor: { id: user.id, email: user.email, name: user.name, role, permissions },
  };
}

/** Ca `requireAccountsSession`, plus tokenul de poartă din headerul `x-accounts-gate`. */
export async function requireAccountsAccess(req: NextRequest): Promise<AccountsGuard> {
  const guard = await requireAccountsSession(req);
  if (!guard.ok) return guard;

  const gateToken = req.headers.get(GATE_HEADER) ?? undefined;
  if (!(await verifyGateToken(gateToken, guard.actor.email))) {
    // 423 Locked: `locked` e redundant cu statusul, dar scutește UI-ul de
    // ghicit când răspunsul trece printr-un proxy care rescrie codul.
    return deny("Secțiune blocată — introdu PIN-ul", 423, { locked: true });
  }

  return guard;
}

/**
 * IP-ul clientului, pentru jurnal și pentru cheia de rate-limit. Pe Vercel
 * `x-forwarded-for` e lista de hopuri, primul fiind clientul real.
 */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip")?.trim() || "local";
}
