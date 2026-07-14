// Client server-side pentru Gelios GPS (api.geliospro.com).
// Gestionează login-ul OAuth2 (password), cache-uiește token-ul și normalizează
// „units” din Gelios în vehicule cu status + telemetrie ușor de afișat.
//
// Credențialele vin din env (GELIOS_USERNAME / GELIOS_PASSWORD); dacă lipsesc,
// se folosesc cele partajate pentru contul davo, ca integrarea să meargă și fără
// configurare suplimentară pe Vercel.

const BASE = "https://api.geliospro.com";
const USERNAME = process.env.GELIOS_USERNAME || "davoint";
const PASSWORD = process.env.GELIOS_PASSWORD || "gpsdavo";

// Prag peste care considerăm că un vehicul e „offline” (nu mai trimite date).
const OFFLINE_AFTER_SEC = 60 * 60; // 1h

type TokenCache = { token: string; expiresAt: number };
let cache: TokenCache | null = null;

async function login(): Promise<TokenCache> {
  const body = new URLSearchParams({
    grant_type: "password",
    username: USERNAME,
    password: PASSWORD,
  });
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Gelios login failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const ttl = (data.expires_in ?? 3600) * 1000;
  return { token: data.access_token, expiresAt: Date.now() + ttl - 60_000 };
}

async function getToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) return cache.token;
  cache = await login();
  return cache.token;
}

// Fetch autentificat spre Gelios; la 401 reîncearcă o dată cu token nou.
async function geliosFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const doFetch = (t: string) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` },
      cache: "no-store",
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    cache = null;
    res = await doFetch(await getToken());
  }
  return res;
}

// ===== Normalizare =====

export type VehicleStatus = "moving" | "idle" | "stopped" | "offline";

export type Vehicle = {
  id: number;
  name: string;
  status: VehicleStatus;
  lat: number | null;
  lon: number | null;
  speed: number; // km/h
  course: number | null;
  sats: number | null;
  ignition: boolean | null;
  voltage: number | null; // V (alimentare externă)
  battery: number | null; // V (baterie internă backup)
  gsm: number | null; // 0..5
  lastUpdate: number | null; // unix sec (ora mesajului)
  ageSec: number | null;
  phone: string | null;
  hwType: string | null;
  driver: string | null;
};

type RawParams = Record<string, string | number | null>;
type RawLastMsg = {
  time?: number;
  lat?: number;
  lon?: number;
  speed?: number;
  course?: number;
  sats?: number;
  params?: RawParams;
} | null;

type RawUnit = {
  id: number;
  name: string;
  phone?: string | null;
  hwType?: { type?: string; name?: string } | null;
  driver?: { name?: string } | string | null;
  lastMsg?: RawLastMsg;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeStatus(ageSec: number | null, speed: number, ignition: boolean | null): VehicleStatus {
  if (ageSec === null || ageSec > OFFLINE_AFTER_SEC) return "offline";
  if (speed > 0) return "moving";
  if (ignition) return "idle";
  return "stopped";
}

export function normalizeUnit(u: RawUnit, nowSec: number): Vehicle {
  const msg = u.lastMsg || null;
  const params = (msg?.params || {}) as RawParams;
  const time = msg?.time ?? null;
  const ageSec = time ? Math.max(0, Math.round(nowSec - time)) : null;
  const speed = Math.max(0, Math.round(num(msg?.speed) ?? 0));
  const ignRaw = num(params.IGN);
  const ignition = ignRaw === null ? null : ignRaw === 1;
  const pwr = num(params.PWR_EXT);
  const bat = num(params.BAT_V);
  const driver =
    typeof u.driver === "string" ? u.driver : u.driver && "name" in u.driver ? u.driver.name ?? null : null;

  return {
    id: u.id,
    name: u.name,
    status: computeStatus(ageSec, speed, ignition),
    lat: num(msg?.lat),
    lon: num(msg?.lon),
    speed,
    course: num(msg?.course),
    sats: num(msg?.sats),
    ignition,
    voltage: pwr === null ? null : Math.round(pwr / 100) / 10, // mV → V (1 zecimală)
    battery: bat === null ? null : Math.round(bat / 100) / 10,
    gsm: num(params.GSM_SIG),
    lastUpdate: time,
    ageSec,
    phone: u.phone ?? null,
    hwType: u.hwType?.type ?? u.hwType?.name ?? null,
    driver,
  };
}

export type FleetSummary = {
  total: number;
  moving: number;
  idle: number;
  stopped: number;
  offline: number;
};

export async function getFleet(): Promise<{ vehicles: Vehicle[]; summary: FleetSummary }> {
  const res = await geliosFetch("/api/v1/units");
  if (!res.ok) throw new Error(`Gelios units failed (${res.status})`);
  const data = (await res.json()) as { items?: RawUnit[] };
  const nowSec = Math.floor(Date.now() / 1000);
  const vehicles = (data.items || [])
    .map((u) => normalizeUnit(u, nowSec))
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));

  const summary: FleetSummary = {
    total: vehicles.length,
    moving: vehicles.filter((v) => v.status === "moving").length,
    idle: vehicles.filter((v) => v.status === "idle").length,
    stopped: vehicles.filter((v) => v.status === "stopped").length,
    offline: vehicles.filter((v) => v.status === "offline").length,
  };
  return { vehicles, summary };
}

export type VehicleDetail = Vehicle & {
  imei: string | null;
  hwName: string | null;
  createdAt: number | null;
  rawParams: RawParams;
};

export async function getVehicleDetail(id: number): Promise<VehicleDetail | null> {
  const res = await geliosFetch(`/api/v1/units/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gelios unit failed (${res.status})`);
  const u = (await res.json()) as RawUnit & {
    imei?: string | null;
    hwType?: { type?: string; name?: string } | null;
    createdAt?: number | null;
  };
  const nowSec = Math.floor(Date.now() / 1000);
  const base = normalizeUnit(u, nowSec);
  return {
    ...base,
    imei: u.imei ?? null,
    hwName: u.hwType?.name ?? null,
    createdAt: u.createdAt ?? null,
    rawParams: (u.lastMsg?.params || {}) as RawParams,
  };
}
