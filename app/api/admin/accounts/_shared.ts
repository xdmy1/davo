// Validări comune ale rutelor din /api/admin/accounts.
//
// Stau într-un fișier separat, nu într-un `route.ts`, fiindcă Next respinge din
// route-uri orice export care nu e handler HTTP sau opțiune de segment.
// Prefixul „_" scoate fișierul din rutare.
//
// Motivul pentru care sunt puse în comun: aceleași reguli trebuie să valideze
// și crearea, și editarea. Dacă ar fi copiate în fiecare fișier, o divergență
// între POST și PATCH ar deveni o portiță (o parolă de 6 caractere acceptată la
// editare anulează minimul impus la creare).

import { NextResponse } from "next/server";
import { ADMIN_SECTIONS, normalizeRole, type Role } from "@/lib/permissions";
import {
  normalizeRezervariRole,
  REZERVARI_SECTIONS,
  type RezervariRole,
} from "@/lib/rezervariSections";

/** Costul bcrypt pentru parolele adminilor și PIN-urile operatorilor. */
export const BCRYPT_ROUNDS = 10;

/** Cheile de secțiuni acceptate pentru `AdminUser.permissions`. */
export const ADMIN_SECTION_KEYS: string[] = ADMIN_SECTIONS.map((s) => s.key);

/**
 * Cheile acceptate pentru `Operator.permissions`. Catalogul stă în
 * `lib/rezervariSections.ts` — același din care `/meta` trimite căsuțele spre
 * UI, ca validarea de la salvare și lista bifabilă să nu poată diverge.
 */
export const REZERVARI_SECTION_KEYS: string[] = REZERVARI_SECTIONS.map((s) => s.key);

export function fail(error: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

/** Corpul cererii ca obiect, chiar dacă lipsește sau nu e JSON valid. */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const raw: unknown = await req.json().catch(() => null);
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

export function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Emailurile se stochează cu litere mici: `/api/auth/login` caută contul așa. */
export function normalizeEmail(value: unknown): string {
  return readString(value).toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** Rolul se acceptă doar exact scris — `normalizeRole` ar transforma orice greșeală de tipar în „admin". */
export function parseAdminRole(value: unknown): Role | null {
  return value === "admin" || value === "admin2" ? value : null;
}

export function parseRezervariRole(value: unknown): RezervariRole | null {
  return value === "operator" || value === "supervisor" ? value : null;
}

export type PermissionsParse =
  | { ok: true; value: string[] }
  | { ok: false; error: string };

/**
 * Listă de chei din catalog, fără duplicate. Lista goală e validă și înseamnă
 * „folosește presetul rolului"; o cheie inexistentă e respinsă, fiindcă ar
 * bloca tăcut contul (lista ne-goală înlocuiește complet presetul).
 */
export function parsePermissions(value: unknown, allowed: readonly string[]): PermissionsParse {
  if (!Array.isArray(value)) {
    return { ok: false, error: "Permisiunile trebuie trimise ca listă" };
  }

  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.includes(item)) {
      return { ok: false, error: `Permisiune necunoscută: ${String(item)}` };
    }
    if (!result.includes(item)) result.push(item);
  }

  return { ok: true, value: result };
}

/**
 * Câmpurile trimise spre UI pentru un cont de admin. Hash-ul parolei nu e
 * printre ele nici în tip, nici în `select`-ul rutelor.
 */
export const ADMIN_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  permissions: true,
  lastLogin: true,
  createdAt: true,
} as const;

export type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  permissions: string[];
  lastLogin: Date | null;
  createdAt: Date;
};

export function serializeAdmin(user: AdminRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: normalizeRole(user.role),
    active: user.active,
    // Lista brută: goală înseamnă „presetul rolului", iar selectorul din UI are
    // nevoie să distingă asta de o selecție explicită identică cu presetul.
    permissions: user.permissions,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

/** La fel pentru operatori: `pinHash` lipsește peste tot. */
export const OPERATOR_SELECT = {
  id: true,
  name: true,
  slug: true,
  role: true,
  active: true,
  permissions: true,
  lastLogin: true,
  createdAt: true,
  _count: { select: { bookings: true } },
} as const;

export type OperatorRow = {
  id: string;
  name: string;
  slug: string;
  role: string;
  active: boolean;
  permissions: string[];
  lastLogin: Date | null;
  createdAt: Date;
  _count: { bookings: number };
};

export function serializeOperator(operator: OperatorRow) {
  return {
    id: operator.id,
    name: operator.name,
    // Identificatorul de login: se generează la creare și nu se mai schimbă.
    slug: operator.slug,
    role: normalizeRezervariRole(operator.role),
    active: operator.active,
    permissions: operator.permissions,
    bookings: operator._count.bookings,
    lastLogin: operator.lastLogin ? operator.lastLogin.toISOString() : null,
    createdAt: operator.createdAt.toISOString(),
  };
}

/**
 * O singură intrare de jurnal per cerere de editare, cu acțiunea cea mai
 * specifică dintre câmpurile schimbate; restul apar oricum în `details.changed`.
 * Vocabularul e cel din comentariul modelului `AccountAudit`.
 */
export function auditActionFor(changed: readonly string[], active: boolean): string {
  if (changed.includes("active")) return active ? "activate" : "deactivate";
  if (changed.includes("password") || changed.includes("pin")) return "password";
  if (changed.includes("permissions") || changed.includes("role")) return "permissions";
  return "update";
}

/** Coliziune pe un câmp unic (email, slug) — verificarea prealabilă poate fi depășită de o cerere paralelă. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}
