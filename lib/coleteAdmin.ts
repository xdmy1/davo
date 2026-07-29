// Client server-side pentru baza colete (proiect Supabase SEPARAT de restul davo).
//
// Doar `fetch` — fără @supabase/supabase-js, ca să nu adăugăm o dependență
// pentru cinci endpoint-uri REST. Cheia e `service_role`, deci ocolește RLS și
// nu are ce căuta în afara serverului.
//
// Modelul contului de șofer e împărțit în două locuri: `auth.users` (email
// `<username>@colete.local`, parola = PIN-ul) și `public.profiles` (username,
// pin_code, rol, range). Orice modificare trebuie ținută sincronizată între ele.

const AUTH_ADMIN = "/auth/v1/admin/users";
const PROFILES = "/rest/v1/profiles";
const PARCELS = "/rest/v1/parcels";

// Ban „pe viață" în GoTrue (100 de ani). Dezactivarea se face prin ban tocmai
// ca să nu fie nevoie de o coloană nouă și de un redeploy în repo-ul colete:
// un user banat nu mai poate face signInWithPassword, deci PIN-ul lui moare.
const BAN_FOREVER = "876000h";

const USERNAME_RE = /^[a-z0-9_]{2,}$/;
const PIN_RE = /^\d{4,}$/;

export type ColeteRole = "admin" | "driver";

export type ColeteDriver = {
  id: string;
  username: string;
  pin: string;
  role: ColeteRole;
  rangeStart: number;
  rangeEnd: number;
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
  range_start: number;
  range_end: number;
  created_at: string;
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

function checkRange(start: number, end: number): void {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0) {
    throw new Error("Intervalul de numere trebuie să fie format din întregi pozitivi");
  }
  if (start >= end) {
    throw new Error("Începutul intervalului trebuie să fie mai mic decât sfârșitul");
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

async function fetchProfiles(): Promise<ProfileRow[]> {
  return readJson<ProfileRow[]>(
    await coleteFetch(`${PROFILES}?select=*&order=username.asc`),
    "Nu am putut citi șoferii colete",
  );
}

async function fetchProfile(id: string): Promise<ProfileRow> {
  const rows = await readJson<ProfileRow[]>(
    await coleteFetch(`${PROFILES}?id=eq.${encodeURIComponent(id)}&select=*`),
    "Nu am putut citi contul de colete",
  );
  const row = rows[0];
  if (!row) throw new Error("Contul de colete nu există");
  return row;
}

async function fetchAuthUsers(): Promise<Map<string, AuthUserRow>> {
  const data = await readJson<{ users?: AuthUserRow[] }>(
    await coleteFetch(`${AUTH_ADMIN}?page=1&per_page=200`),
    "Nu am putut citi conturile de autentificare colete",
  );
  return new Map((data.users ?? []).map((u) => [u.id, u]));
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

function toDriver(profile: ProfileRow, auth: AuthUserRow | undefined, parcels: number): ColeteDriver {
  const bannedUntil = auth?.banned_until ? new Date(auth.banned_until) : null;
  const banned = Boolean(bannedUntil && bannedUntil > new Date());
  return {
    id: profile.id,
    username: profile.username,
    pin: profile.pin_code,
    role: profile.role,
    rangeStart: profile.range_start,
    rangeEnd: profile.range_end,
    // Un profil fără cont de autentificare (rest dintr-o ștergere parțială) nu
    // se poate loga — îl arătăm inactiv, nu activ.
    active: Boolean(auth) && !banned,
    parcels,
    lastSignInAt: auth?.last_sign_in_at ?? null,
    createdAt: profile.created_at,
  };
}

export async function listColeteDrivers(): Promise<ColeteDriver[]> {
  const [profiles, authUsers] = await Promise.all([fetchProfiles(), fetchAuthUsers()]);
  // Un request de numărare per șofer, dar în paralel: sunt câțiva, nu mii.
  const counts = await Promise.all(profiles.map((p) => countColeteParcels(p.id)));
  return profiles.map((profile, i) => toDriver(profile, authUsers.get(profile.id), counts[i]));
}

// ===== Scriere =====

export async function createColeteDriver(input: {
  username: string;
  pin: string;
  role: ColeteRole;
  rangeStart: number;
  rangeEnd: number;
}): Promise<ColeteDriver> {
  const username = cleanUsername(input.username);
  const pin = cleanPin(input.pin);
  const role = cleanRole(input.role);
  checkRange(input.rangeStart, input.rangeEnd);

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

  // 2. Profilul. Dacă pică, contul auth de mai sus rămâne orfan (login imposibil,
  //    dar email-ul blocat pentru o reîncercare) — de asta îl dăm înapoi la 3.
  let profile: ProfileRow;
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
          range_start: input.rangeStart,
          range_end: input.rangeEnd,
        }),
      }),
      "Nu am putut crea profilul șoferului",
    );
    if (!rows[0]) throw new Error("Nu am putut crea profilul șoferului");
    profile = rows[0];
  } catch (error) {
    // 3. Rollback. Edge function-ul din colete nu îl face și lasă conturi orfane.
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

  return toDriver(profile, { ...authUser, banned_until: null, last_sign_in_at: null }, 0);
}

export async function updateColeteDriver(
  id: string,
  patch: {
    username?: string;
    pin?: string;
    role?: ColeteRole;
    rangeStart?: number;
    rangeEnd?: number;
    active?: boolean;
  },
): Promise<void> {
  const current = await fetchProfile(id);

  const username = patch.username !== undefined ? cleanUsername(patch.username) : current.username;
  const pin = patch.pin !== undefined ? cleanPin(patch.pin) : current.pin_code;
  const role = patch.role !== undefined ? cleanRole(patch.role) : current.role;
  const rangeStart = patch.rangeStart !== undefined ? patch.rangeStart : current.range_start;
  const rangeEnd = patch.rangeEnd !== undefined ? patch.rangeEnd : current.range_end;
  // Validăm intervalul întreg, nu doar capătul trimis: altfel un start mutat
  // peste sfârșitul existent ar trece nevăzut.
  checkRange(rangeStart, rangeEnd);

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
  if (rangeStart !== current.range_start) profileBody.range_start = rangeStart;
  if (rangeEnd !== current.range_end) profileBody.range_end = rangeEnd;

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

/**
 * Ștergem doar contul de autentificare: `profiles.id` are
 * `ON DELETE CASCADE` spre `auth.users`, deci profilul dispare odată cu el.
 */
export async function deleteColeteDriver(id: string): Promise<void> {
  const res = await coleteFetch(`${AUTH_ADMIN}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw await failure(res, "Nu am putut șterge contul de colete");
}
