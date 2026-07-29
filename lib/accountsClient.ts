/**
 * Clientul HTTP al secțiunii „Conturi & Acces” și contractul de tipuri pe care
 * îl împart pagina, ecranul de poartă și cele cinci taburi.
 *
 * Fiecare cerere are nevoie de tokenul de poartă; fără el rutele răspund 423.
 * Ăsta e și motivul pentru care fișierul există: un `fetch` scris de mână
 * într-un tab ar rata headerul sau ar trata 423 ca pe o eroare oarecare, iar
 * adminul ar rămâne în fața unui tabel care nu se mai încarcă, fără să afle că
 * trebuie doar să reintroducă PIN-ul.
 */

// `import type` se șterge complet la compilare, deci tipurile de mai jos vin
// din sursa lor reală fără ca modulele de server (Prisma, fetch cu cheia
// service_role) să ajungă în bundle-ul clientului.
import type { ColeteDriver, ColeteRole } from "@/lib/coleteAdmin";
import type { Role } from "@/lib/permissions";
import type { RezervariRole } from "@/lib/rezervariSections";

// Re-exportate ca taburile să aibă o singură sursă de importuri.
export type { ColeteDriver, ColeteRole, Role, RezervariRole };

/**
 * Duplicat deliberat față de `lib/accountsGate.ts`: acela importă Prisma și
 * bcrypt, deci nu poate fi importat dintr-un component client. Valoarea
 * trebuie să rămână identică în cele două locuri.
 */
export const GATE_HEADER = "x-accounts-gate";

// ───────────────────────────── Tipuri de date ─────────────────────────────

export type AccountSystem = "davo" | "rezervari" | "colete" | "gate";

/** O secțiune bifabilă în selectorul de permisiuni (fără prefixele de rutare). */
export type SectionOption = {
  key: string;
  label: string;
  group: string;
};

/** Răspunsul lui GET /api/admin/accounts/meta. */
export type AccountsMeta = {
  davoSections: SectionOption[];
  rezervariSections: SectionOption[];
  davoPresets: Record<Role, string[]>;
  rezervariPresets: Record<RezervariRole, string[]>;
  /** Fals când lipsesc COLETE_SUPABASE_* — tabul de colete explică, nu eșuează. */
  coleteConfigured: boolean;
  actorEmail: string;
  actorRole: Role;
  /** Durata de viață a tokenului de poartă, pentru contorul din antet. */
  gateTtlMs: number;
};

/** Un rând din tabul „Admini davo.md”. `permissions` e lista BRUTĂ: goală = presetul rolului. */
export type AdminAccount = {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  permissions: string[];
  lastLogin: string | null;
  createdAt: string;
};

/** Un rând din tabul „Operatori rezervari”. `slug` e identificatorul de login și nu se schimbă. */
export type OperatorAccount = {
  id: string;
  name: string;
  slug: string;
  role: RezervariRole;
  active: boolean;
  permissions: string[];
  bookings: number;
  lastLogin: string | null;
  createdAt: string;
};

/** O intrare din jurnal. `details` rămâne text (JSON scurt) exact cum a fost scris. */
export type AuditEntry = {
  id: string;
  actorEmail: string;
  action: string;
  system: string;
  targetId: string | null;
  targetName: string;
  details: string | null;
  ip: string | null;
  createdAt: string;
};

// ─────────────────────── Corpurile răspunsurilor de la API ───────────────────────
// Câmpul `success` lipsește din tipuri: `apiFetch` îl verifică deja, iar un tab
// care ar mai putea să-l citească ar sugera că mai are ceva de verificat.

export type UnlockResponse = { token: string; expiresAt: number };
export type DavoListResponse = { meId: string; users: AdminAccount[] };
export type DavoMutationResponse = { user: AdminAccount };
export type RezervariListResponse = { operators: OperatorAccount[] };
export type RezervariMutationResponse = { operator: OperatorAccount };
export type ColeteListResponse = {
  configured: boolean;
  drivers: ColeteDriver[];
  /** Prezent doar când `configured` e fals: explică ce variabile lipsesc. */
  message?: string;
};
export type ColeteMutationResponse = { driver: ColeteDriver };
export type AuditListResponse = { entries: AuditEntry[]; limit: number };

// ───────────────────────────── Transportul ─────────────────────────────

export type AccountsApiFailure = {
  ok: false;
  /** 0 înseamnă că cererea nici n-a plecat (rețea căzută). */
  status: number;
  error: string;
  /** 423: sesiunea e bună, dar poarta s-a închis — se cere PIN-ul din nou. */
  locked: boolean;
  /** Secunde rămase din blocajul anti brute-force (429), dacă serverul le-a trimis. */
  retryAfter: number | null;
};

export type AccountsApiResult<T> = { ok: true; data: T } | AccountsApiFailure;

/** Mesaj de rezervă când serverul n-a apucat să trimită unul (proxy, 502, HTML de eroare). */
function defaultError(status: number): string {
  if (status === 401) return "Sesiunea a expirat — autentifică-te din nou";
  if (status === 403) return "Nu ai acces la această secțiune";
  if (status === 404) return "Resursa nu a fost găsită";
  if (status >= 500) return "Eroare pe server — încearcă din nou";
  return `Eroare neașteptată (${status})`;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Cerere către /api/admin/accounts cu tokenul de poartă atașat.
 *
 * `token` lipsă sau null e valid și înseamnă „fără header” — exact cazul lui
 * `/unlock`, singura rută care nu cere poarta fiindcă abia o deschide.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<AccountsApiResult<T>> {
  const headers = new Headers(init?.headers);
  if (token) headers.set(GATE_HEADER, token);
  // Toate rutele citesc JSON; setat aici ca fiecare apelant să scrie doar
  // `body: JSON.stringify(...)`.
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    // `no-store`: conturile se schimbă chiar din ecranul ăsta, o listă din
    // cache ar arăta modificarea ca și cum n-ar fi avut loc.
    res = await fetch(path, { ...init, headers, cache: "no-store" });
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Conexiune întreruptă — verifică internetul și încearcă din nou",
      locked: false,
      retryAfter: null,
    };
  }

  const raw: unknown = await res.json().catch(() => null);
  const body = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null);

  // Statusul e sursa principală; `locked` din corp e plasa de siguranță pentru
  // cazul în care un proxy rescrie codul 423.
  const locked = res.status === 423 || body?.locked === true;

  if (!res.ok || body === null || body.success === false) {
    const fromHeader = Number(res.headers.get("Retry-After"));
    return {
      ok: false,
      status: res.status,
      error:
        typeof body?.error === "string" && body.error
          ? body.error
          : defaultError(res.status),
      locked,
      retryAfter: readNumber(body?.retryAfter) ?? readNumber(fromHeader),
    };
  }

  return { ok: true, data: body as T };
}

// ───────────────────────── Contractul taburilor ─────────────────────────

/**
 * Props-urile primite de fiecare tab din `/admin/conturi`.
 *
 * `onError` și `onSuccess` scriu în bannerul de sus al paginii; string-ul gol
 * îl ascunde. Un tab poate afișa în plus erori locale (de formular), dar
 * problemele care privesc toată pagina trec pe aici, ca să nu apară două
 * bannere diferite în același ecran.
 */
export type AccountsTabProps = {
  /** Tokenul de poartă, valabil doar cât ține sesiunea de UI. */
  token: string;
  meta: AccountsMeta;
  /** Se cheamă la 423: pagina golește tokenul și reafișează ecranul de PIN. */
  onLocked: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

/**
 * Traducerea uniformă a unui eșec în cele două callback-uri de mai sus, ca
 * toate taburile să reacționeze la fel la o poartă expirată.
 */
export function reportFailure(
  failure: AccountsApiFailure,
  handlers: Pick<AccountsTabProps, "onLocked" | "onError">,
): void {
  if (failure.locked) {
    handlers.onLocked();
    return;
  }
  handlers.onError(failure.error);
}
