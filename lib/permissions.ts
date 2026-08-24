/**
 * Catalogul secțiunilor din /admin și regulile de acces.
 *
 * Permisiunile nu mai sunt liste de path-uri hardcodate pe rol, ci chei de
 * secțiuni salvate pe fiecare cont (`AdminUser.permissions`). Rolul rămâne
 * doar ca preset: lista goală înseamnă „folosește presetul rolului", deci
 * conturile existente (care au `permissions = []`) se comportă exact ca înainte.
 *
 * Catalogul e sursa unică de adevăr și pentru sidebar, și pentru proxy, și
 * pentru selectorul de permisiuni din „Conturi & Acces".
 */

export type Role = "admin" | "admin2";

export type AdminSection = {
  key: string; // "bookings"
  label: string; // "Rezervări"
  group: string; // "Operare" | "Configurare" | "Comunicare" | "Sistem"
  ui: string[]; // prefixe de path UI
  api: string[]; // prefixe de path API deținute de secțiune
  apiDeps?: string[]; // prefixe API permise DOAR pe GET (lookup-uri de care depind formularele)
};

/**
 * Ordinea contează: `homePathForRole` întoarce prima secțiune permisă din listă,
 * iar UI-ul afișează grupurile în ordinea asta.
 *
 * Toate path-urile de mai jos există în `app/(admin)/admin/` și `app/api/admin/`
 * (excepție: `accounts`, secțiunea nouă adăugată odată cu panoul).
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Operare",
    ui: ["/admin"],
    api: ["/api/admin/stats"],
  },
  {
    key: "bookings",
    label: "Rezervări",
    group: "Operare",
    ui: ["/admin/bookings"],
    api: ["/api/admin/bookings"],
    // Formularul de rezervare manuală citește locurile cursei; rutele și
    // autocarele completau dropdown-urile în presetul vechi al lui admin2 și
    // rămân permise pe citire ca să nu-i schimbăm comportamentul.
    apiDeps: ["/api/admin/trips", "/api/admin/routes", "/api/admin/buses"],
  },
  {
    key: "furnizori",
    label: "Furnizori",
    group: "Operare",
    ui: ["/admin/furnizori"],
    api: ["/api/admin/furnizori"],
  },
  {
    key: "seats",
    label: "Schemă autocar",
    group: "Operare",
    ui: ["/admin/seats"],
    api: [],
    // Pagina n-are API propriu: citește cursele publice și harta locurilor.
    apiDeps: ["/api/admin/trips"],
  },
  {
    key: "trips",
    label: "Curse",
    group: "Operare",
    ui: ["/admin/trips"],
    api: ["/api/admin/trips"],
  },
  {
    key: "vehicles",
    label: "Mașini GPS & mentenanță",
    group: "Operare",
    ui: ["/admin/vehicles"],
    api: ["/api/admin/vehicles"],
  },
  {
    key: "countries",
    label: "Țări & program",
    group: "Configurare",
    ui: ["/admin/countries"],
    api: ["/api/admin/countries", "/api/admin/geography"],
  },
  {
    key: "orare",
    label: "Orar ridicări",
    group: "Configurare",
    ui: ["/admin/orare"],
    api: [],
  },
  {
    key: "routes",
    label: "Rute",
    group: "Configurare",
    ui: ["/admin/routes"],
    api: ["/api/admin/routes"],
  },
  {
    key: "buses",
    label: "Autocare",
    group: "Configurare",
    ui: ["/admin/buses"],
    api: ["/api/admin/buses"],
  },
  {
    key: "clients",
    label: "Clienți",
    group: "Configurare",
    ui: ["/admin/clients"],
    api: ["/api/admin/clients"],
  },
  {
    key: "fuel",
    label: "Rezervor motorină",
    group: "Configurare",
    ui: ["/admin/fuel"],
    api: ["/api/admin/fuel"],
  },
  {
    key: "emails",
    label: "Emailuri",
    group: "Comunicare",
    ui: ["/admin/emails"],
    api: ["/api/admin/emails", "/api/admin/test-email"],
  },
  {
    key: "settings",
    label: "Setări",
    group: "Comunicare",
    ui: ["/admin/settings"],
    api: [],
  },
  {
    key: "accounts",
    label: "Conturi & Acces",
    group: "Sistem",
    ui: ["/admin/conturi"],
    api: ["/api/admin/accounts"],
  },
];

// Identitatea proprie e necesară oricui: sidebar-ul și ecranele de admin o cer
// înainte să știe ce permisiuni are userul.
export const ALWAYS_ALLOWED_API: string[] = ["/api/admin/me"];

export const ROLE_PRESETS: Record<Role, string[]> = {
  // „admin" primește tot, inclusiv `accounts` — altfel nimeni n-ar putea
  // deschide panoul de conturi prima dată.
  admin: ADMIN_SECTIONS.map((s) => s.key),
  // Identic cu vechiul preset al lui admin2.
  admin2: ["bookings", "clients", "seats"],
};

function prefixMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/**
 * Câștigă prefixul cel mai lung: `/admin` aparține secțiunii `dashboard`, dar
 * `/admin/bookings/x` merge la `bookings`. Fără regula asta `/admin` ar înghiți
 * toate paginile.
 */
function longestMatch(
  pathname: string,
  prefixesOf: (s: AdminSection) => string[],
): AdminSection | null {
  let best: AdminSection | null = null;
  let bestLength = -1;

  for (const section of ADMIN_SECTIONS) {
    for (const prefix of prefixesOf(section)) {
      if (prefixMatches(pathname, prefix) && prefix.length > bestLength) {
        best = section;
        bestLength = prefix.length;
      }
    }
  }

  return best;
}

/** Normalizează un string oarecare la un Role cunoscut. Default → "admin"
 *  (back-compat cu userii vechi, fără coloana `role`). */
export function normalizeRole(value: string | null | undefined): Role {
  return value === "admin2" ? "admin2" : "admin";
}

/** Lista efectivă de chei: cea a userului dacă e ne-goală, altfel presetul rolului. */
export function effectivePermissions(role: Role, permissions?: string[] | null): string[] {
  if (permissions && permissions.length > 0) return permissions;
  return ROLE_PRESETS[role];
}

/** Secțiunea căreia îi aparține un path de UI (prefixul cel mai lung). */
export function sectionForUIPath(pathname: string): AdminSection | null {
  return longestMatch(pathname, (s) => s.ui);
}

export function canAccessUI(
  role: Role,
  pathname: string,
  permissions?: string[] | null,
): boolean {
  const section = sectionForUIPath(pathname);
  if (!section) return false; // path necunoscut → refuz implicit
  return effectivePermissions(role, permissions).includes(section.key);
}

export function canAccessAPI(
  role: Role,
  pathname: string,
  permissions?: string[] | null,
  method?: string,
): boolean {
  if (ALWAYS_ALLOWED_API.some((p) => prefixMatches(pathname, p))) return true;

  const allowed = effectivePermissions(role, permissions);

  // Întâi API-urile deținute de secțiuni (orice metodă), apoi dependențele —
  // separat, fiindcă dependențele sunt permise doar pe citire.
  const owner = longestMatch(pathname, (s) => s.api);
  if (owner && allowed.includes(owner.key)) return true;

  const isRead = (method ?? "GET").toUpperCase() === "GET";
  if (!isRead) return false;

  // Aici NU se aplică „prefixul cel mai lung": o dependență e un drept în plus,
  // nu o proprietate. Dacă două secțiuni declară același lookup, e suficient ca
  // userul s-o aibă pe una din ele.
  return ADMIN_SECTIONS.some(
    (s) =>
      allowed.includes(s.key) &&
      (s.apiDeps ?? []).some((prefix) => prefixMatches(pathname, prefix)),
  );
}

/**
 * Prima pagină la care userul chiar are acces — dashboard dacă poate, altfel
 * prima secțiune permisă. Proxy-ul redirecționează aici când accesul e refuzat,
 * deci un path fără acces ar produce bucle de redirect.
 */
export function homePathForRole(role: Role, permissions?: string[] | null): string {
  const allowed = effectivePermissions(role, permissions);

  for (const section of ADMIN_SECTIONS) {
    if (!allowed.includes(section.key)) continue;
    const path = section.ui[0];
    if (path) return path;
  }

  // Niciun acces (permisiuni invalide) → login, nu /admin: altfel ar cicla.
  return "/login";
}
