// Client server-side pentru baza colete (proiect Supabase SEPARAT de restul davo).
//
// Doar `fetch` — fără @supabase/supabase-js, ca să nu adăugăm o dependență
// pentru câteva endpoint-uri REST. Cheia e `service_role`, deci ocolește RLS și
// nu are ce căuta în afara serverului.
//
// Modelul contului de șofer e împărțit în TREI locuri și toate trei trebuie
// ținute sincronizate:
//   • `auth.users`            — email `<username>@colete.local`, parola = PIN-ul,
//                               banul (= dezactivarea contului);
//   • `public.profiles`       — username, pin_code, rol, destinațiile excluse,
//                               țările de colectare, contorul comun de ridicări;
//   • `public.driver_route_ranges` — intervalele de numere, UNUL PE RUTĂ
//                               (origin → destination), mai multe pe șofer.
//
// ATENȚIE: `profiles` NU are `range_start` / `range_end`. Numerotarea coletelor
// se citește exclusiv din `driver_route_ranges`, căutat după
// (driver_id, origin, destination).

const AUTH_ADMIN = "/auth/v1/admin/users";
const PROFILES = "/rest/v1/profiles";
const PARCELS = "/rest/v1/parcels";
const ROUTE_RANGES = "/rest/v1/driver_route_ranges";

// Ban „pe viață" în GoTrue (100 de ani). Dezactivarea se face prin ban tocmai
// ca să nu fie nevoie de o coloană nouă și de un redeploy în repo-ul colete:
// un user banat nu mai poate face signInWithPassword, deci PIN-ul lui moare.
const BAN_FOREVER = "876000h";

const USERNAME_RE = /^[a-z0-9_]{2,}$/;
const PIN_RE = /^\d{4,}$/;
// Codurile chiar folosite în baza colete (origin, destination,
// excluded_destinations, allowed_collection_countries).
const COUNTRY_RE = /^[A-Z]{2}$/;

export type ColeteRole = "admin" | "driver";

/**
 * Țările între care circulă coletele. Lista e închisă pentru că numerotarea și
 * prefixele din aplicația colete depind de coduri exacte — un „RO" scris din
 * greșeală ar crea o rută care nu se potrivește niciodată cu nimic.
 */
export const COLETE_COUNTRIES = [
  { code: "MD", label: "Moldova" },
  { code: "UK", label: "Regatul Unit" },
  { code: "BE", label: "Belgia" },
  { code: "NL", label: "Țările de Jos" },
  { code: "DE", label: "Germania" },
] as const;

export const COLETE_COUNTRY_CODES: string[] = COLETE_COUNTRIES.map((c) => c.code);

/** Un rând din `driver_route_ranges`: intervalul de numere pe o singură rută. */
export type ColeteRouteRange = {
  id: string;
  origin: string;
  destination: string;
  rangeStart: number;
  rangeEnd: number;
};

export type ColeteDriver = {
  id: string;
  username: string;
  pin: string;
  role: ColeteRole;
  /** Destinații pe care contul NU le vede (pe un admin, restrânge și lista de șoferi). */
  excludedDestinations: string[];
  /** `null` = fără acces la Colectări. Un array = acces doar pe țările listate. */
  allowedCollectionCountries: string[] | null;
  /** True = numerotarea ignoră ruta și folosește un contor comun pe tot contul. */
  sharedPickupCounter: boolean;
  /** Intervalele de numere, unul pe rută. Ordonate origine → destinație. */
  routeRanges: ColeteRouteRange[];
  /** = NU e banat în Supabase Auth (și contul de autentificare există). */
  active: boolean;
  /** Colete ne-arhivate atribuite. */
  parcels: number;
  lastSignInAt: string | null;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  username: string;
  pin_code: string;
  role: ColeteRole;
  excluded_destinations: string[] | null;
  allowed_collection_countries: string[] | null;
  shared_pickup_counter: boolean;
  created_at: string;
};

type RouteRangeRow = {
  id: string;
  driver_id: string;
  origin: string;
  destination: string;
  range_start: number;
  range_end: number;
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  banned_until?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
};

// ===== Transport =====

function config(): { url: string; key: string } {
  const url = (process.env.COLETE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.COLETE_SUPABASE_SERVICE_KEY ?? "").trim();
  if (!url || !key) {
    throw new Error(
      "Baza colete nu e configurată — lipsesc COLETE_SUPABASE_URL / COLETE_SUPABASE_SERVICE_KEY",
    );
  }
  return { url, key };
}

export function coleteConfigured(): boolean {
  return Boolean(
    (process.env.COLETE_SUPABASE_URL ?? "").trim() &&
      (process.env.COLETE_SUPABASE_SERVICE_KEY ?? "").trim(),
  );
}

async function coleteFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, key } = config();
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    // Conturile se schimbă din panou; un răspuns cache-uit ar arăta starea veche.
    cache: "no-store",
  });
}

// Supabase pune mesajul util când în `message`, când în `msg` sau `error_description`.
async function failure(res: Response, context: string): Promise<Error> {
  const raw = await res.text().catch(() => "");
  let detail = "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const field of ["message", "msg", "error_description", "error", "details", "hint"]) {
      const value = parsed[field];
      if (typeof value === "string" && value.trim()) {
        detail = value.trim();
        break;
      }
    }
  } catch {
    detail = raw.slice(0, 200).trim();
  }
  return new Error(detail ? `${context}: ${detail}` : `${context} (HTTP ${res.status})`);
}

async function readJson<T>(res: Response, context: string): Promise<T> {
  if (!res.ok) throw await failure(res, context);
  return (await res.json()) as T;
}

// ===== Validări (identice cu ce așteaptă aplicația colete) =====

function cleanUsername(value: string): string {
  const username = (value ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new Error("Nume invalid — doar litere mici, cifre și _, minimum 2 caractere");
  }
  return username;
}

function cleanPin(value: string): string {
  const pin = (value ?? "").trim();
  if (!PIN_RE.test(pin)) {
    throw new Error("PIN invalid — minimum 4 cifre");
  }
  return pin;
}

function cleanRole(value: string): ColeteRole {
  if (value !== "admin" && value !== "driver") {
    throw new Error("Rol invalid — doar „admin” sau „driver”");
  }
  return value;
}

function cleanCountry(value: unknown, what: string): string {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!COUNTRY_RE.test(code) || !COLETE_COUNTRY_CODES.includes(code)) {
    throw new Error(`${what} invalid — folosește ${COLETE_COUNTRY_CODES.join(", ")}`);
  }
  return code;
}

/** Listă de coduri de țară, fără duplicate, în ordinea din `COLETE_COUNTRIES`. */
function cleanCountryList(value: unknown, what: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${what} trebuie să fie o listă de coduri de țară`);
  }
  const codes = new Set(value.map((item) => cleanCountry(item, what)));
  return COLETE_COUNTRY_CODES.filter((code) => codes.has(code));
}

/** Capetele intervalului. `start === end` e valid: o rută cu un singur număr. */
function checkRange(start: number, end: number): void {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) {
    throw new Error("Intervalul trebuie să fie format din două numere întregi pozitive");
  }
  if (start > end) {
    throw new Error("Începutul intervalului nu poate fi mai mare decât sfârșitul");
  }
}

function sameRoute(a: { origin: string; destination: string }, b: { origin: string; destination: string }): boolean {
  return a.origin === b.origin && a.destination === b.destination;
}

function rangesOverlap(
  a: { rangeStart: number; rangeEnd: number },
  b: { rangeStart: number; rangeEnd: number },
): boolean {
  return a.rangeStart <= b.rangeEnd && b.rangeStart <= a.rangeEnd;
}

/**
 * Perechile de intervale ale ACELUIAȘI șofer care se suprapun.
 *
 * NU e o eroare în sine — vezi `assertRangeFits`. Contoarele sunt per rută
 * (driver_id, origin, destination), deci în baza reală suprapunerile sunt
 * regula, nu excepția: 13 din 17 conturi au aceleași numere pe mai multe rute,
 * fiindcă prefixul literei din `human_id` le ține separate (B100 vs OL100).
 * Rezultatul se folosește doar ca avertisment în UI.
 */
export function overlappingRoutePairs(
  ranges: ColeteRouteRange[],
): { a: ColeteRouteRange; b: ColeteRouteRange }[] {
  const pairs: { a: ColeteRouteRange; b: ColeteRouteRange }[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlap(ranges[i], ranges[j])) pairs.push({ a: ranges[i], b: ranges[j] });
    }
  }
  return pairs;
}

/**
 * Verifică un interval nou/modificat față de celelalte intervale ale șoferului.
 *
 * Două reguli, ambele derivate din felul în care colete numerotează:
 *
 * 1. O rută apare o singură dată — asta e și constrângerea unică
 *    `(driver_id, origin, destination)` din baza de date. O prindem aici ca
 *    adminul să vadă un mesaj, nu un 409 brut de la PostgREST.
 * 2. Când `shared_pickup_counter` e activ, numerotarea IGNORĂ ruta și trage
 *    dintr-un singur contor. Un contor înseamnă un singur interval, deci toate
 *    rândurile șoferului trebuie să aibă exact aceleași capete; două intervale
 *    diferite ar face ca același număr să fie liber pe o rută și ocupat pe alta.
 *    (Cazul real: `repartizare_olanda`, NL→MD și BE→MD, ambele 200–299.)
 *
 * Suprapunerea între rute distincte cu contoare distincte NU se blochează:
 * ar face imposibilă salvarea majorității conturilor existente.
 */
function assertRangeFits(
  candidate: { id?: string; origin: string; destination: string; rangeStart: number; rangeEnd: number },
  siblings: ColeteRouteRange[],
  sharedPickupCounter: boolean,
): void {
  const others = siblings.filter((row) => row.id !== candidate.id);

  const duplicate = others.find((row) => sameRoute(row, candidate));
  if (duplicate) {
    throw new Error(
      `Ruta ${candidate.origin} → ${candidate.destination} are deja un interval (${duplicate.rangeStart}–${duplicate.rangeEnd}). Editează-l pe acela în loc să adaugi încă unul.`,
    );
  }

  if (sharedPickupCounter) {
    const different = others.find(
      (row) => row.rangeStart !== candidate.rangeStart || row.rangeEnd !== candidate.rangeEnd,
    );
    if (different) {
      throw new Error(
        `Contul are contor comun de ridicări, deci toate rutele trag numere din același interval — trebuie să aibă capete identice. Ruta ${different.origin} → ${different.destination} folosește ${different.rangeStart}–${different.rangeEnd}, iar tu ai cerut ${candidate.rangeStart}–${candidate.rangeEnd}.`,
      );
    }
  }
}

/** Aruncă dacă username-ul e deja luat. `exceptId` sare peste contul editat. */
async function assertUsernameFree(username: string, exceptId?: string): Promise<void> {
  const query = `${PROFILES}?username=eq.${encodeURIComponent(username)}&select=id${
    exceptId ? `&id=neq.${encodeURIComponent(exceptId)}` : ""
  }`;
  const rows = await readJson<{ id: string }[]>(
    await coleteFetch(query),
    "Nu am putut verifica numele",
  );
  if (rows.length > 0) {
    throw new Error(`Numele „${username}” este deja folosit de alt cont`);
  }
}

/**
 * Aruncă dacă PIN-ul e deja folosit. Login-ul colete caută profilul DUPĂ
 * `pin_code` (`.eq('pin_code', pin).single()`), deci un duplicat nu doar că e
 * ambiguu — sparge autentificarea celuilalt șofer.
 */
async function assertPinFree(pin: string, exceptId?: string): Promise<void> {
  const query = `${PROFILES}?pin_code=eq.${encodeURIComponent(pin)}&select=id,username${
    exceptId ? `&id=neq.${encodeURIComponent(exceptId)}` : ""
  }`;
  const rows = await readJson<{ id: string; username: string }[]>(
    await coleteFetch(query),
    "Nu am putut verifica PIN-ul",
  );
  if (rows.length > 0) {
    throw new Error(`PIN-ul este deja folosit de „${rows[0].username}”`);
  }
}

// ===== Citire =====

const PROFILE_COLUMNS =
  "id,username,pin_code,role,excluded_destinations,allowed_collection_countries,shared_pickup_counter,created_at";

async function fetchProfiles(): Promise<ProfileRow[]> {
  return readJson<ProfileRow[]>(
    await coleteFetch(`${PROFILES}?select=${PROFILE_COLUMNS}&order=username.asc`),
    "Nu am putut citi șoferii colete",
  );
}

async function fetchProfile(id: string): Promise<ProfileRow> {
  const rows = await readJson<ProfileRow[]>(
    await coleteFetch(`${PROFILES}?id=eq.${encodeURIComponent(id)}&select=${PROFILE_COLUMNS}`),
    "Nu am putut citi contul de colete",
  );
  const row = rows[0];
  if (!row) throw new Error("Contul de colete nu există");
  return row;
}

function toRouteRange(row: RouteRangeRow): ColeteRouteRange {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    rangeStart: row.range_start,
    rangeEnd: row.range_end,
  };
}

function sortRanges(rows: ColeteRouteRange[]): ColeteRouteRange[] {
  return rows.sort(
    (a, b) =>
      a.origin.localeCompare(b.origin) ||
      a.destination.localeCompare(b.destination) ||
      a.rangeStart - b.rangeStart,
  );
}

/**
 * TOATE intervalele, într-un singur request, indexate pe `driver_id`.
 *
 * Sunt zeci de rânduri în total (43 în baza reală) — un request per șofer ar
 * fi 17 dus-întorsuri pentru aceeași informație.
 */
export async function listColeteRouteRanges(): Promise<Map<string, ColeteRouteRange[]>> {
  const rows = await readJson<RouteRangeRow[]>(
    await coleteFetch(`${ROUTE_RANGES}?select=*&order=driver_id.asc,origin.asc,destination.asc`),
    "Nu am putut citi intervalele de numere",
  );
  const byDriver = new Map<string, ColeteRouteRange[]>();
  for (const row of rows) {
    const list = byDriver.get(row.driver_id);
    if (list) list.push(toRouteRange(row));
    else byDriver.set(row.driver_id, [toRouteRange(row)]);
  }
  for (const list of byDriver.values()) sortRanges(list);
  return byDriver;
}

/**
 * Numele contului, pentru jurnal. Separat de `fetchProfile` fiindcă rutele de
 * intervale nu au nevoie de restul profilului, iar jurnalul nu merită o
 * excepție: dacă citirea pică, intrarea se scrie cu numele lipsă.
 */
export async function coleteDriverName(id: string): Promise<string> {
  try {
    const rows = await readJson<{ username: string }[]>(
      await coleteFetch(`${PROFILES}?id=eq.${encodeURIComponent(id)}&select=username`),
      "Nu am putut citi numele contului",
    );
    return rows[0]?.username ?? "";
  } catch {
    return "";
  }
}

/** Intervalele unui singur șofer — folosit înainte de scrieri, ca stare proaspătă. */
export async function listDriverRouteRanges(driverId: string): Promise<ColeteRouteRange[]> {
  const rows = await readJson<RouteRangeRow[]>(
    await coleteFetch(
      `${ROUTE_RANGES}?driver_id=eq.${encodeURIComponent(driverId)}&select=*&order=origin.asc,destination.asc`,
    ),
    "Nu am putut citi intervalele de numere ale șoferului",
  );
  return sortRanges(rows.map(toRouteRange));
}

/**
 * Conturile de autentificare, indexate după id.
 *
 * Calea rapidă e un singur request pe listă. Dar GoTrue întoarce 500 pe TOATĂ
 * lista dacă un singur rând din `auth.users` are NULL într-o coloană pe care el
 * o așteaptă text gol — tipic pentru conturi create manual prin SQL, nu prin API
 * (în colete e cazul lui `admin2`). Fără plasa de siguranță de mai jos, un rând
 * stricat ascunde toți ceilalți șoferi, deși profilurile lor se citesc perfect.
 */
async function fetchAuthUsers(ids: string[]): Promise<Map<string, AuthUserRow>> {
  try {
    const data = await readJson<{ users?: AuthUserRow[] }>(
      await coleteFetch(`${AUTH_ADMIN}?page=1&per_page=200`),
      "Nu am putut citi conturile de autentificare colete",
    );
    return new Map((data.users ?? []).map((u) => [u.id, u]));
  } catch (error) {
    console.error("colete: listarea auth a eșuat, cad pe citiri individuale", error);

    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          const user = await readJson<AuthUserRow>(
            await coleteFetch(`${AUTH_ADMIN}/${encodeURIComponent(id)}`),
            "Nu am putut citi contul de autentificare",
          );
          return [id, user] as const;
        } catch {
          // Exact rândul stricat. Îl lăsăm fără auth: `toDriver` îl arată
          // inactiv, ceea ce e onest — chiar nu putem ști dacă e banat.
          return null;
        }
      }),
    );

    return new Map(entries.filter((e): e is readonly [string, AuthUserRow] => e !== null));
  }
}

/**
 * Câte colete ne-arhivate are șoferul. `Prefer: count=exact` + `Range: 0-0`
 * aduce doar numărul (din headerul `content-range`), nu și rândurile.
 */
export async function countColeteParcels(driverId: string): Promise<number> {
  const res = await coleteFetch(
    `${PARCELS}?driver_id=eq.${encodeURIComponent(driverId)}&is_archived=eq.false&select=id`,
    { headers: { Prefer: "count=exact", Range: "0-0" } },
  );
  // 416 = interval în afara rezultatului, adică zero colete: are `content-range: */0`.
  if (!res.ok && res.status !== 416) {
    throw await failure(res, "Nu am putut număra coletele");
  }
  const match = /\/(\d+)\s*$/.exec(res.headers.get("content-range") ?? "");
  if (!match) {
    // Fără număr sigur, un „0" inventat ar permite ștergerea unui șofer cu colete.
    throw new Error("Nu am putut număra coletele șoferului");
  }
  return Number(match[1]);
}

function toDriver(
  profile: ProfileRow,
  auth: AuthUserRow | undefined,
  parcels: number,
  routeRanges: ColeteRouteRange[],
): ColeteDriver {
  const bannedUntil = auth?.banned_until ? new Date(auth.banned_until) : null;
  const banned = Boolean(bannedUntil && bannedUntil > new Date());
  return {
    id: profile.id,
    username: profile.username,
    pin: profile.pin_code,
    role: profile.role,
    // Coloana are `default '{}'`, dar un NULL scris manual din SQL n-ar trebui
    // să spargă tabelul: îl citim ca listă goală.
    excludedDestinations: profile.excluded_destinations ?? [],
    // Aici NULL e semnificativ: înseamnă „fără acces la Colectări”, altceva
    // decât o listă goală. Nu se normalizează.
    allowedCollectionCountries: profile.allowed_collection_countries,
    sharedPickupCounter: Boolean(profile.shared_pickup_counter),
    routeRanges,
    // Un profil fără cont de autentificare (rest dintr-o ștergere parțială) nu
    // se poate loga — îl arătăm inactiv, nu activ.
    active: Boolean(auth) && !banned,
    parcels,
    lastSignInAt: auth?.last_sign_in_at ?? null,
    createdAt: profile.created_at,
  };
}

export async function listColeteDrivers(): Promise<ColeteDriver[]> {
  // Profilurile sunt sursa de adevăr pentru cine există; auth-ul doar îmbogățește
  // rândul cu starea de ban și ultima autentificare. De aceea se citesc primele.
  const profiles = await fetchProfiles();
  const [authUsers, ranges, counts] = await Promise.all([
    fetchAuthUsers(profiles.map((p) => p.id)),
    listColeteRouteRanges(),
    // Un request de numărare per șofer, dar în paralel: sunt câțiva, nu mii.
    Promise.all(profiles.map((p) => countColeteParcels(p.id))),
  ]);
  return profiles.map((profile, i) =>
    toDriver(profile, authUsers.get(profile.id), counts[i], ranges.get(profile.id) ?? []),
  );
}

// ===== Scriere: contul =====

export type ColeteRouteRangeInput = {
  origin: string;
  destination: string;
  rangeStart: number;
  rangeEnd: number;
};

/** Normalizează un interval trimis din formular; nu atinge baza. */
function cleanRangeInput(input: ColeteRouteRangeInput): ColeteRouteRangeInput {
  const origin = cleanCountry(input.origin, "Țara de origine");
  const destination = cleanCountry(input.destination, "Țara de destinație");
  if (origin === destination) {
    throw new Error("Ruta trebuie să lege două țări diferite");
  }
  checkRange(input.rangeStart, input.rangeEnd);
  return { origin, destination, rangeStart: input.rangeStart, rangeEnd: input.rangeEnd };
}

export async function createColeteDriver(input: {
  username: string;
  pin: string;
  role: ColeteRole;
  excludedDestinations?: string[];
  allowedCollectionCountries?: string[] | null;
  sharedPickupCounter?: boolean;
  routeRanges?: ColeteRouteRangeInput[];
}): Promise<ColeteDriver> {
  const username = cleanUsername(input.username);
  const pin = cleanPin(input.pin);
  const role = cleanRole(input.role);
  const excludedDestinations =
    input.excludedDestinations === undefined
      ? []
      : cleanCountryList(input.excludedDestinations, "Destinație exclusă");
  const allowedCollectionCountries =
    input.allowedCollectionCountries === undefined || input.allowedCollectionCountries === null
      ? null
      : cleanCountryList(input.allowedCollectionCountries, "Țară de colectare");
  const sharedPickupCounter = Boolean(input.sharedPickupCounter);

  // Intervalele se validează ÎNAINTE să atingem Supabase: un formular greșit nu
  // trebuie să lase în urmă un cont de autentificare pe care apoi să-l dăm înapoi.
  const ranges: ColeteRouteRange[] = [];
  for (const raw of input.routeRanges ?? []) {
    const clean = cleanRangeInput(raw);
    assertRangeFits(clean, ranges, sharedPickupCounter);
    // id fictiv doar pentru verificarea între ele; cel real vine de la baza de date.
    ranges.push({ id: `nou-${ranges.length}`, ...clean });
  }

  await assertUsernameFree(username);
  await assertPinFree(pin);

  // 1. Contul de autentificare — el generează id-ul folosit ca `profiles.id`.
  const authUser = await readJson<AuthUserRow>(
    await coleteFetch(AUTH_ADMIN, {
      method: "POST",
      body: JSON.stringify({
        email: `${username}@colete.local`,
        password: pin,
        email_confirm: true,
      }),
    }),
    "Nu am putut crea contul de autentificare",
  );
  if (!authUser?.id) {
    throw new Error("Supabase nu a întors id-ul contului de autentificare");
  }

  // 2. Profilul, apoi intervalele. Dacă vreunul pică, contul auth de mai sus ar
  //    rămâne orfan (login imposibil, dar email-ul blocat pentru o reîncercare)
  //    — de asta îl dăm înapoi la 3.
  let profile: ProfileRow;
  let savedRanges: ColeteRouteRange[] = [];
  try {
    const rows = await readJson<ProfileRow[]>(
      await coleteFetch(PROFILES, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: authUser.id,
          username,
          pin_code: pin,
          role,
          excluded_destinations: excludedDestinations,
          allowed_collection_countries: allowedCollectionCountries,
          shared_pickup_counter: sharedPickupCounter,
        }),
      }),
      "Nu am putut crea profilul șoferului",
    );
    if (!rows[0]) throw new Error("Nu am putut crea profilul șoferului");
    profile = rows[0];

    if (ranges.length > 0) {
      const inserted = await readJson<RouteRangeRow[]>(
        await coleteFetch(ROUTE_RANGES, {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(
            ranges.map((row) => ({
              driver_id: authUser.id,
              origin: row.origin,
              destination: row.destination,
              range_start: row.rangeStart,
              range_end: row.rangeEnd,
            })),
          ),
        }),
        "Nu am putut salva intervalele de numere",
      );
      savedRanges = sortRanges(inserted.map(toRouteRange));
    }
  } catch (error) {
    // 3. Rollback. Edge function-ul din colete nu îl face și lasă conturi orfane.
    //    Intervalele întâi: dacă FK-ul spre `profiles` n-are ON DELETE CASCADE,
    //    ștergerea profilului ar fi refuzată cât timp ele există.
    await deleteRangesOf(authUser.id).catch(() => {});
    const rolledBack = await coleteFetch(`${AUTH_ADMIN}/${encodeURIComponent(authUser.id)}`, {
      method: "DELETE",
    })
      .then((res) => res.ok)
      .catch(() => false);

    const message = error instanceof Error ? error.message : "Eroare la crearea profilului";
    throw new Error(
      rolledBack
        ? message
        : `${message}. Atenție: contul de autentificare „${username}@colete.local” a rămas creat și trebuie șters manual din Supabase.`,
    );
  }

  return toDriver(
    profile,
    { ...authUser, banned_until: null, last_sign_in_at: null },
    0,
    savedRanges,
  );
}

export async function updateColeteDriver(
  id: string,
  patch: {
    username?: string;
    pin?: string;
    role?: ColeteRole;
    excludedDestinations?: string[];
    allowedCollectionCountries?: string[] | null;
    sharedPickupCounter?: boolean;
    active?: boolean;
  },
): Promise<void> {
  const current = await fetchProfile(id);

  const username = patch.username !== undefined ? cleanUsername(patch.username) : current.username;
  const pin = patch.pin !== undefined ? cleanPin(patch.pin) : current.pin_code;
  const role = patch.role !== undefined ? cleanRole(patch.role) : current.role;

  const excludedDestinations =
    patch.excludedDestinations !== undefined
      ? cleanCountryList(patch.excludedDestinations, "Destinație exclusă")
      : (current.excluded_destinations ?? []);
  const allowedCollectionCountries =
    patch.allowedCollectionCountries === undefined
      ? current.allowed_collection_countries
      : patch.allowedCollectionCountries === null
        ? null
        : cleanCountryList(patch.allowedCollectionCountries, "Țară de colectare");
  const sharedPickupCounter =
    patch.sharedPickupCounter !== undefined
      ? patch.sharedPickupCounter
      : Boolean(current.shared_pickup_counter);

  // Pornirea contorului comun schimbă înțelesul intervalelor existente: din
  // contoare separate pe rută devin unul singur. Dacă rândurile nu au capete
  // identice, numerotarea ar deveni ambiguă — mai bine refuzăm acum, cu o
  // explicație, decât să lăsăm aplicația să emită numere duplicate.
  if (sharedPickupCounter && !current.shared_pickup_counter) {
    const existing = await listDriverRouteRanges(id);
    const first = existing[0];
    const different = first
      ? existing.find(
          (row) => row.rangeStart !== first.rangeStart || row.rangeEnd !== first.rangeEnd,
        )
      : undefined;
    if (first && different) {
      throw new Error(
        `Contorul comun de ridicări cere ca toate rutele să folosească același interval, dar contul are ${first.origin} → ${first.destination} pe ${first.rangeStart}–${first.rangeEnd} și ${different.origin} → ${different.destination} pe ${different.rangeStart}–${different.rangeEnd}. Egalizează intervalele întâi.`,
      );
    }
  }

  if (username !== current.username) await assertUsernameFree(username, id);
  if (pin !== current.pin_code) await assertPinFree(pin, id);

  // ── auth.users: email (username), parolă (PIN), ban (activ/inactiv) ──
  const authBody: Record<string, unknown> = {};
  if (username !== current.username) authBody.email = `${username}@colete.local`;
  if (pin !== current.pin_code) authBody.password = pin;
  if (patch.active !== undefined) authBody.ban_duration = patch.active ? "none" : BAN_FOREVER;

  if (Object.keys(authBody).length > 0) {
    const res = await coleteFetch(`${AUTH_ADMIN}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(authBody),
    });
    if (!res.ok) throw await failure(res, "Nu am putut actualiza autentificarea");
  }

  // ── public.profiles ──
  const profileBody: Record<string, unknown> = {};
  if (username !== current.username) profileBody.username = username;
  if (pin !== current.pin_code) profileBody.pin_code = pin;
  if (role !== current.role) profileBody.role = role;
  if (patch.excludedDestinations !== undefined) {
    profileBody.excluded_destinations = excludedDestinations;
  }
  if (patch.allowedCollectionCountries !== undefined) {
    profileBody.allowed_collection_countries = allowedCollectionCountries;
  }
  if (sharedPickupCounter !== Boolean(current.shared_pickup_counter)) {
    profileBody.shared_pickup_counter = sharedPickupCounter;
  }

  if (Object.keys(profileBody).length === 0) return;

  const res = await coleteFetch(`${PROFILES}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(profileBody),
  });
  if (!res.ok) {
    const cause = await failure(res, "Eroare la profil");
    const authChanged = Object.keys(authBody).length > 0;
    // Parola veche nu se poate reface (nu o mai știm), deci nu există rollback:
    // singurul lucru corect e să spunem explicit ce a rămas desincronizat.
    throw new Error(
      authChanged
        ? `${cause.message}. Autentificarea a fost deja schimbată (PIN/username nou funcționează la login), dar profilul din colete a rămas cu datele vechi — repetă salvarea.`
        : cause.message,
    );
  }
}

// ===== Scriere: intervalele per rută =====

/** Traduce erorile PostgREST ale tabelei de intervale în mesaje pentru om. */
function rangeFailureMessage(raw: string, origin: string, destination: string): string {
  // 23505 = unique_violation pe (driver_id, origin, destination). Cursa cu alt
  // admin care a adăugat aceeași rută între citirea noastră și scriere trece pe
  // aici — verificarea din `assertRangeFits` prinde doar ce era deja în listă.
  if (/23505|duplicate key|already exists|unique/i.test(raw)) {
    return `Ruta ${origin} → ${destination} are deja un interval pentru acest șofer. Reîmprospătează lista și editează rândul existent.`;
  }
  if (/23503|foreign key/i.test(raw)) {
    return "Șoferul nu mai există în baza colete — reîmprospătează lista.";
  }
  return raw;
}

export async function createColeteRouteRange(
  driverId: string,
  input: ColeteRouteRangeInput,
): Promise<ColeteRouteRange> {
  const clean = cleanRangeInput(input);
  const profile = await fetchProfile(driverId);
  const siblings = await listDriverRouteRanges(driverId);
  assertRangeFits(clean, siblings, Boolean(profile.shared_pickup_counter));

  const res = await coleteFetch(ROUTE_RANGES, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      driver_id: driverId,
      origin: clean.origin,
      destination: clean.destination,
      range_start: clean.rangeStart,
      range_end: clean.rangeEnd,
    }),
  });
  if (!res.ok) {
    const cause = await failure(res, "Nu am putut adăuga intervalul");
    throw new Error(rangeFailureMessage(cause.message, clean.origin, clean.destination));
  }
  const rows = (await res.json()) as RouteRangeRow[];
  if (!rows[0]) throw new Error("Nu am putut adăuga intervalul");
  return toRouteRange(rows[0]);
}

export async function updateColeteRouteRange(
  driverId: string,
  rangeId: string,
  patch: Partial<ColeteRouteRangeInput>,
): Promise<ColeteRouteRange> {
  const profile = await fetchProfile(driverId);
  const siblings = await listDriverRouteRanges(driverId);
  const current = siblings.find((row) => row.id === rangeId);
  if (!current) throw new Error("Intervalul nu există la acest șofer");

  const clean = cleanRangeInput({
    origin: patch.origin ?? current.origin,
    destination: patch.destination ?? current.destination,
    // Validăm intervalul întreg, nu doar capătul trimis: altfel un start mutat
    // peste sfârșitul existent ar trece nevăzut.
    rangeStart: patch.rangeStart ?? current.rangeStart,
    rangeEnd: patch.rangeEnd ?? current.rangeEnd,
  });
  assertRangeFits({ id: rangeId, ...clean }, siblings, Boolean(profile.shared_pickup_counter));

  const res = await coleteFetch(
    `${ROUTE_RANGES}?id=eq.${encodeURIComponent(rangeId)}&driver_id=eq.${encodeURIComponent(driverId)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        origin: clean.origin,
        destination: clean.destination,
        range_start: clean.rangeStart,
        range_end: clean.rangeEnd,
      }),
    },
  );
  if (!res.ok) {
    const cause = await failure(res, "Nu am putut salva intervalul");
    throw new Error(rangeFailureMessage(cause.message, clean.origin, clean.destination));
  }
  const rows = (await res.json()) as RouteRangeRow[];
  if (!rows[0]) throw new Error("Intervalul nu există la acest șofer");
  return toRouteRange(rows[0]);
}

export async function deleteColeteRouteRange(driverId: string, rangeId: string): Promise<void> {
  const res = await coleteFetch(
    `${ROUTE_RANGES}?id=eq.${encodeURIComponent(rangeId)}&driver_id=eq.${encodeURIComponent(driverId)}`,
    { method: "DELETE", headers: { Prefer: "return=representation" } },
  );
  if (!res.ok) throw await failure(res, "Nu am putut șterge intervalul");
  const rows = (await res.json().catch(() => [])) as RouteRangeRow[];
  // Zero rânduri = id greșit sau interval al altui șofer. Un „gata" tăcut ar
  // face ca lista să pară curățată când de fapt n-am șters nimic.
  if (rows.length === 0) throw new Error("Intervalul nu există la acest șofer");
}

// ===== Ștergerea contului =====

/** Șterge intervalele unui șofer și le întoarce pe cele șterse (pentru refacere). */
async function deleteRangesOf(driverId: string): Promise<ColeteRouteRange[]> {
  const res = await coleteFetch(`${ROUTE_RANGES}?driver_id=eq.${encodeURIComponent(driverId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  if (!res.ok) throw await failure(res, "Nu am putut șterge intervalele de numere");
  const rows = (await res.json().catch(() => [])) as RouteRangeRow[];
  return rows.map(toRouteRange);
}

async function restoreRanges(driverId: string, ranges: ColeteRouteRange[]): Promise<boolean> {
  if (ranges.length === 0) return true;
  try {
    const res = await coleteFetch(ROUTE_RANGES, {
      method: "POST",
      body: JSON.stringify(
        ranges.map((row) => ({
          id: row.id,
          driver_id: driverId,
          origin: row.origin,
          destination: row.destination,
          range_start: row.rangeStart,
          range_end: row.rangeEnd,
        })),
      ),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Șterge contul: intervale → autentificare (profilul cade în cascadă).
 *
 * Ordinea contează fiindcă nu știm dacă `driver_route_ranges.driver_id` are
 * `ON DELETE CASCADE` spre `profiles`:
 *   • dacă NU are, ștergerea profilului ar fi refuzată cât timp intervalele
 *     există, deci ele trebuie să plece primele;
 *   • dacă are, ștergerea lor explicită nu strică nimic — la pasul următor n-ar
 *     mai fi rămas nimic de șters oricum.
 *
 * Riscul ordinii ăsteia e ca ștergerea din auth să pice DUPĂ ce intervalele au
 * dispărut, lăsând un cont funcțional fără numerotare; de asta le păstrăm și le
 * punem la loc dacă pasul doi eșuează.
 */
export async function deleteColeteDriver(id: string): Promise<void> {
  const removedRanges = await deleteRangesOf(id);

  const res = await coleteFetch(`${AUTH_ADMIN}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const cause = await failure(res, "Nu am putut șterge contul de colete");
    const restored = await restoreRanges(id, removedRanges);
    throw new Error(
      restored
        ? cause.message
        : `${cause.message}. Atenție: cele ${removedRanges.length} intervale de numere ale contului au fost șterse și nu au putut fi puse la loc — reintrodu-le manual.`,
    );
  }

  // Plasa de siguranță pentru cazul în care ștergerea de mai sus a mers, dar
  // rândurile au reapărut/rămas (cascadă parțială, trigger). Nu aruncă: contul
  // e deja dus, iar rândurile rămase fără șofer nu blochează nimic.
  await deleteRangesOf(id).catch(() => []);
}
