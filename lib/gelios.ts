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
  address: string | null;
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
  const address = base.lat !== null && base.lon !== null ? await reverseGeocode(base.lat, base.lon) : null;
  return {
    ...base,
    imei: u.imei ?? null,
    hwName: u.hwType?.name ?? null,
    createdAt: u.createdAt ?? null,
    address,
    rawParams: (u.lastMsg?.params || {}) as RawParams,
  };
}

// ===== Contoare (odometru + ore motor) =====
// Gelios ține un odometru absolut per unitate în `counters.mileage.value` (km)
// și orele de motor în `counters.engineHours.value`. Câmpul NU vine în lista
// `/units` (e null acolo) — doar în detaliul `/units/{id}`. Îl folosim ca sursă
// live pentru evidența mentenanței (km rămași până la următorul service).

export type VehicleCounters = { mileageKm: number | null; engineHours: number | null };

export async function getVehicleCounters(id: number): Promise<VehicleCounters> {
  const res = await geliosFetch(`/api/v1/units/${id}`);
  if (!res.ok) return { mileageKm: null, engineHours: null };
  const u = (await res.json()) as {
    counters?: { mileage?: { value?: unknown }; engineHours?: { value?: unknown } } | null;
  };
  return {
    mileageKm: num(u.counters?.mileage?.value),
    engineHours: num(u.counters?.engineHours?.value),
  };
}

// Cache scurt pe contoare — odometrul se mișcă lent, iar dashboard-ul de
// mentenanță cere contoarele pentru toată flota la fiecare încărcare. Evită să
// batem Gelios cu N cereri per refresh.
const COUNTER_TTL_MS = 5 * 60 * 1000;
const counterCache = new Map<number, { v: VehicleCounters; at: number }>();

export async function getCounters(
  ids: number[],
  nowMs: number
): Promise<Record<number, VehicleCounters>> {
  const out: Record<number, VehicleCounters> = {};
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      const c = counterCache.get(id);
      if (c && nowMs - c.at < COUNTER_TTL_MS) {
        out[id] = c.v;
        return;
      }
      try {
        const v = await getVehicleCounters(id);
        counterCache.set(id, { v, at: nowMs });
        out[id] = v;
      } catch {
        out[id] = { mileageKm: null, engineHours: null };
      }
    })
  );
  return out;
}

// ===== Adresă (reverse geocoding via OpenStreetMap Nominatim) =====

const addrCache = new Map<string, string | null>();

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (addrCache.has(key)) return addrCache.get(key) ?? null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ro&zoom=16`,
      { headers: { "User-Agent": "DAVO-Admin/1.0 (fleet monitoring)" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { display_name?: string };
    const addr = j.display_name ?? null;
    addrCache.set(key, addr);
    return addr;
  } catch {
    return null;
  }
}

// ===== Istoric traseu (route replay via report engine) =====

let unitsTemplateId: number | null = null;

async function getUnitsReportTemplateId(): Promise<number> {
  if (unitsTemplateId) return unitsTemplateId;
  const res = await geliosFetch("/api/v1/reports/templates");
  if (res.ok) {
    const data = (await res.json()) as { items?: { id: number; type?: { type?: string } }[] };
    const items = data.items || [];
    const t = items.find((x) => x.type?.type === "units") || items[0];
    if (t?.id) {
      unitsTemplateId = t.id;
      return t.id;
    }
  }
  unitsTemplateId = 115; // fallback la template-ul de sistem "Complex"
  return unitsTemplateId;
}

export type TrackPoint = { lat: number; lon: number; t: number | null };
export type TripStats = {
  mileageKm: number;
  movingSec: number; // trip duration (mișcare)
  parkingSec: number;
  maxSpeed: number; // km/h
  avgSpeed: number; // km/h (mileage / trip duration)
  timeStart: number | null;
  timeEnd: number | null;
};
export type ReportTable = { name: string; columns: string[]; rows: string[][] };
export type Analytics = { points: TrackPoint[]; stats: TripStats; tables: ReportTable[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Indexuri de coloană în tabelul "Statistics" al template-ului units (vezi /docs).
const STAT_COL = { timeStart: 0, timeEnd: 1, mileage: 2, tripDuration: 5, parking: 6, maxSpeed: 7 };

// Formatează o celulă de raport în funcție de tipul coloanei Gelios.
function formatCell(cell: { val?: unknown; invalid?: boolean } | undefined, type: string): string {
  if (!cell || cell.invalid || cell.val === null || cell.val === undefined || cell.val === "") return "—";
  const v = cell.val;
  const n = Number(v);
  switch (type) {
    case "timestamp_datetime":
    case "timestamp":
      return Number.isFinite(n)
        ? new Date(n * 1000).toLocaleString("ro-RO", {
            timeZone: "Europe/Chisinau",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : String(v);
    case "distance":
    case "distance_odo":
      return `${Math.round(n * 10) / 10} km`;
    case "speed":
      return `${Math.round(n)} km/h`;
    case "volume":
      return `${Math.round(n * 10) / 10} l`;
    case "duration": {
      const s = Math.round(n);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    case "duration_hours":
      return `${Math.round(n * 10) / 10} h`;
    case "fuel-economy":
      return String(Math.round(n * 100) / 100);
    default:
      return typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v);
  }
}

export async function getAnalytics(unitId: number, fromSec: number, toSec: number): Promise<Analytics> {
  const reportId = await getUnitsReportTemplateId();
  const post = await geliosFetch("/api/v1/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report_id: reportId,
      unit_ids: [unitId],
      time_from: fromSec,
      time_to: toSec,
      language: "en",
      user_timezone: 180,
      track_mode: "all",
      map_markers: [],
    }),
  });
  if (!post.ok) throw new Error(`Gelios report failed (${post.status})`);
  const { uuid } = (await post.json()) as { uuid: string };

  // Așteaptă ca raportul să fie complet generat înainte să tragem date, altfel
  // maps/track întoarce 200 dar gol. Polling pe /status până toate tabelele sunt ready.
  type StatusResp = {
    struct?: { tables?: { id: number; name: string; ready?: boolean | string }[] };
    statistic?: { status?: string; percentage_of_completion?: number };
  };
  let defs: { id: number; name: string }[] = [];
  for (let i = 0; i < 25; i++) {
    const stRes = await geliosFetch(`/api/v1/reports/${uuid}/status`);
    if (stRes.ok) {
      const status = (await stRes.json()) as StatusResp;
      const t = status.struct?.tables || [];
      defs = t.map((x) => ({ id: x.id, name: x.name }));
      const pct = status.statistic?.percentage_of_completion;
      const allReady = t.length > 0 && t.every((x) => x.ready === true || x.ready === "True" || x.ready === "true");
      if (status.statistic?.status === "ready" || pct === 100 || allReady) break;
    }
    await sleep(700);
  }

  // Traseul (după ce raportul e gata).
  type TrackRaw = { tracks?: { coordinates?: number[][]; timestamps?: number[] }[] };
  let trackRaw: TrackRaw | null = null;
  for (let i = 0; i < 8; i++) {
    const tr = await geliosFetch(`/api/v1/reports/${uuid}/maps/track?unit_id=${unitId}`);
    if (tr.ok) {
      trackRaw = (await tr.json()) as TrackRaw;
      if ((trackRaw.tracks?.length ?? 0) > 0) break;
    }
    await sleep(500);
  }

  const points: TrackPoint[] = [];
  for (const seg of trackRaw?.tracks || []) {
    const coords = seg.coordinates || [];
    const ts = seg.timestamps || [];
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      if (!c || c.length < 2) continue;
      points.push({ lat: c[1], lon: c[0], t: ts[i] ?? null });
    }
  }

  let stats: TripStats = {
    mileageKm: 0,
    movingSec: 0,
    parkingSec: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    timeStart: null,
    timeEnd: null,
  };
  const tables: ReportTable[] = [];

  try {
    // Tabelele raportului (Statistics, Trips, Parkings, Filling/drain, ...).
    for (const def of defs) {
      const res = await geliosFetch(
        `/api/v1/reports/${uuid}?table_id=${def.id}&row_start=0&rows_count=300`
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        data?: { data?: { val?: unknown; invalid?: boolean }[] }[];
        table_header?: { name?: string; columns?: { name?: string; data_type?: string }[] };
      };
      const cols = data.table_header?.columns || [];
      const rows = data.data || [];

      if (def.id === STAT_COL.timeStart /* table 0 = Statistics */) {
        const r = rows[0]?.data;
        if (r) {
          const cell = (i: number) => (r[i]?.invalid ? 0 : Number(r[i]?.val) || 0);
          const mileageKm = Math.round(cell(STAT_COL.mileage) * 10) / 10;
          const movingSec = cell(STAT_COL.tripDuration);
          stats = {
            mileageKm,
            movingSec,
            parkingSec: cell(STAT_COL.parking),
            maxSpeed: Math.round(cell(STAT_COL.maxSpeed)),
            avgSpeed: movingSec > 0 ? Math.round((mileageKm / (movingSec / 3600)) * 10) / 10 : 0,
            timeStart: cell(STAT_COL.timeStart) || null,
            timeEnd: cell(STAT_COL.timeEnd) || null,
          };
        }
        continue; // Statisticile se afișează ca metrici, nu ca tabel brut.
      }

      if (rows.length === 0) continue;
      tables.push({
        name: data.table_header?.name || def.name,
        columns: cols.map((c) => c.name || ""),
        rows: rows.map((row) => (row.data || []).map((c, i) => formatCell(c, cols[i]?.data_type || ""))),
      });
    }
  } catch {
    /* best-effort; traseul rămâne valid chiar dacă statistica pică */
  }

  return { points, stats, tables };
}
