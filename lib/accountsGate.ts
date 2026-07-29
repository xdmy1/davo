// Poarta secțiunii „Conturi & Acces": o a doua barieră, peste sesiunea de admin.
// Cine intră aici poate crea conturi în toate cele trei sisteme, deci o sesiune
// uitată deschisă pe un laptop nu trebuie să fie suficientă.
//
// PIN-ul NU stă în cod. Ordinea de rezolvare: rândul `Settings.accounts_gate_pin`
// (hash bcrypt) → bootstrap unic din `ACCOUNTS_GATE_PIN` → „neconfigurat".
// Ultimul caz refuză accesul: o poartă care nu știe parola nu se deschide singură.

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const GATE_HEADER = "x-accounts-gate";
export const GATE_TTL_MS = 30 * 60 * 1000;

export const GATE_UNCONFIGURED_ERROR =
  "PIN-ul secțiunii nu e configurat — rulează `npm run accounts:pin -- <pin>`";

const PIN_SETTINGS_KEY = "accounts_gate_pin";
const SECRET_SETTINGS_KEY = "session_secret";
const BCRYPT_ROUNDS = 10;
const PIN_RE = /^\d{4,}$/;

// Cheia de semnare a porții = secretul de sesiune prefixat cu scopul. Astfel un
// cookie `davo_admin_session` valid nu poate fi trimis ca token de poartă (și
// invers): semnăturile nu se potrivesc niciodată între cele două domenii.
const GATE_SCOPE = "accounts-gate|";

// ===== Secretul de semnare =====

let cachedSecret: string | null = null;

// Aceeași rezolvare ca în lib/session.ts (env → Settings), ca ambele tokenuri
// să moară odată dacă secretul e rotit. Nu importăm din session.ts: acolo
// `getSessionSecret` e privat, iar tokenul de sesiune are alt format.
async function getGateSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  if (process.env.SESSION_SECRET) {
    cachedSecret = GATE_SCOPE + process.env.SESSION_SECRET;
    return cachedSecret;
  }

  const setting = await prisma.settings.upsert({
    where: { key: SECRET_SETTINGS_KEY },
    update: {},
    create: {
      id: SECRET_SETTINGS_KEY,
      key: SECRET_SETTINGS_KEY,
      value: randomBytes(32).toString("hex"),
    },
  });
  cachedSecret = GATE_SCOPE + setting.value;
  return cachedSecret;
}

function toBase64Url(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(sig);
}

// Comparație în timp constant: o comparație normală scurge, prin durată, câte
// caractere din semnătură a ghicit corect atacatorul.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ===== PIN =====

/** Hash-ul curent al PIN-ului, cu bootstrap unic din env. `null` = neconfigurat. */
async function resolveGateHash(): Promise<string | null> {
  const existing = await prisma.settings.findUnique({
    where: { key: PIN_SETTINGS_KEY },
    select: { value: true },
  });
  if (existing?.value) return existing.value;

  const seed = (process.env.ACCOUNTS_GATE_PIN ?? "").trim();
  if (!PIN_RE.test(seed)) return null;

  const hash = await bcrypt.hash(seed, BCRYPT_ROUNDS);
  // `update: {}` — dacă între timp altcineva a scris rândul (două cereri
  // simultane, sau PIN-ul a fost schimbat din UI), păstrăm ce e în bază.
  // Bootstrap-ul din env se întâmplă o singură dată, exact ca la session_secret.
  const saved = await prisma.settings.upsert({
    where: { key: PIN_SETTINGS_KEY },
    update: {},
    create: { id: PIN_SETTINGS_KEY, key: PIN_SETTINGS_KEY, value: hash },
    select: { value: true },
  });
  return saved.value;
}

export async function gateStatus(): Promise<"ready" | "unconfigured"> {
  try {
    return (await resolveGateHash()) ? "ready" : "unconfigured";
  } catch (error) {
    // Baza inaccesibilă înseamnă „nu pot verifica", nu „lasă-l să intre".
    console.error("accountsGate/gateStatus", error);
    return "unconfigured";
  }
}

export async function verifyGatePin(pin: string): Promise<boolean> {
  const candidate = (pin ?? "").trim();
  if (!PIN_RE.test(candidate)) return false;

  const hash = await resolveGateHash();
  if (!hash) return false; // poartă neconfigurată → închisă, nu deschisă
  return bcrypt.compare(candidate, hash);
}

/** Scrie noul PIN (hash bcrypt, 10 runde). Aruncă dacă formatul e invalid. */
export async function setGatePin(pin: string): Promise<void> {
  const next = (pin ?? "").trim();
  if (!PIN_RE.test(next)) {
    throw new Error("PIN-ul trebuie să conțină minimum 4 cifre");
  }
  const hash = await bcrypt.hash(next, BCRYPT_ROUNDS);
  await prisma.settings.upsert({
    where: { key: PIN_SETTINGS_KEY },
    update: { value: hash },
    create: { id: PIN_SETTINGS_KEY, key: PIN_SETTINGS_KEY, value: hash },
  });
}

// ===== Token de poartă =====
//
// Format: `${base64url(email)}|${expiresAt}.${semnătură}`. Trăiește doar în
// memoria paginii (header `x-accounts-gate`), niciodată în cookie — de asta un
// refresh cere PIN-ul din nou. Legarea de email face tokenul netransferabil
// între admini.

export async function createGateToken(email: string): Promise<string> {
  const secret = await getGateSecret();
  const payload = `${toBase64Url(new TextEncoder().encode(normalizeEmail(email)))}|${
    Date.now() + GATE_TTL_MS
  }`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifyGateToken(
  token: string | undefined,
  email: string,
): Promise<boolean> {
  if (!token) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const secret = await getGateSecret();
  if (!safeEqual(signature, await hmac(payload, secret))) return false;

  const sep = payload.indexOf("|");
  if (sep < 0) return false;

  try {
    const tokenEmail = fromBase64Url(payload.slice(0, sep));
    const expiresAt = Number(payload.slice(sep + 1));
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
    return tokenEmail === normalizeEmail(email);
  } catch {
    return false; // payload corupt
  }
}

// ===== Anti brute-force =====
//
// Map în memorie, resetat la redeploy și separat per instanță serverless —
// best-effort, dar suficient: un PIN de 4 cifre are 10.000 de combinații, iar
// 5 încercări la 15 minute per instanță fac ghicitul impracticabil.

type Bucket = { fails: number; firstFailAt: number; blockedUntil: number };

const buckets = new Map<string, Bucket>();

const MAX_FAILS = 5; // încercări greșite permise…
const WINDOW_MS = 15 * 60 * 1000; // …într-o fereastră de 15 min
const BLOCK_MS = 15 * 60 * 1000; // apoi blocăm 15 min

function bucketFor(key: string): Bucket {
  let b = buckets.get(key);
  const now = Date.now();
  if (!b || (now - b.firstFailAt > WINDOW_MS && now > b.blockedUntil)) {
    b = { fails: 0, firstFailAt: now, blockedUntil: 0 };
    buckets.set(key, b);
  }
  return b;
}

/** Secundele rămase de blocare pentru cheia `email|ip`, sau 0 dacă e permis. */
export function gateBlockedSeconds(key: string): number {
  const b = buckets.get(key);
  if (!b) return 0;
  const left = b.blockedUntil - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

export function recordGateFailure(key: string): void {
  const b = bucketFor(key);
  b.fails += 1;
  if (b.fails >= MAX_FAILS) {
    b.blockedUntil = Date.now() + BLOCK_MS;
  }
  // Curățare oportunistă ca Map-ul să nu crească nelimitat.
  if (buckets.size > 1000) {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (now - v.firstFailAt > WINDOW_MS && now > v.blockedUntil) buckets.delete(k);
    }
  }
}

export function recordGateSuccess(key: string): void {
  buckets.delete(key);
}
