/**
 * Helper-uri pentru programul săptămânal pe țară.
 *
 * Programul e stocat în coloane simple pe `Country` (outboundWeekday/Time/DurationHours
 * + returnWeekday/Time/DurationHours). Toate orele sunt interpretate în zona
 * Europe/Chisinau, astfel încât "joi 10:00" pentru Adrian e mereu 10:00 la Chișinău,
 * indiferent de TZ-ul serverului (Vercel rulează UTC).
 *
 * Funcțiile de aici nu ating Prisma — primesc obiecte deja încărcate.
 */

const TZ = "Europe/Chisinau";

export type CountrySchedule = {
  outboundWeekday: number | null;
  outboundTime: string | null;
  outboundDurationHours: number | null;
  returnWeekday: number | null;
  returnTime: string | null;
  returnDurationHours: number | null;
};

export type Direction = "outbound" | "return";

export function isOutboundActive(c: CountrySchedule): boolean {
  return (
    c.outboundWeekday !== null &&
    c.outboundWeekday !== undefined &&
    !!c.outboundTime &&
    !!c.outboundDurationHours
  );
}

export function isReturnActive(c: CountrySchedule): boolean {
  return (
    c.returnWeekday !== null &&
    c.returnWeekday !== undefined &&
    !!c.returnTime &&
    !!c.returnDurationHours
  );
}

export function isCountryActive(c: CountrySchedule): boolean {
  return isOutboundActive(c) && isReturnActive(c);
}

/**
 * Pentru un weekday + ora "HH:mm" în Europe/Chisinau, calculează data UTC
 * a primei apariții ≥ `from`. Apoi se pot adăuga 7*N zile pt următoarele.
 */
function nextOccurrence(weekday: number, hhmm: string, from: Date): Date {
  const [hh, mm] = hhmm.split(":").map(Number);
  // Iterăm zi cu zi (max 8 zile) construind data în Europe/Chisinau.
  // Folosim Intl.DateTimeFormat ca să aflăm "ziua locală" a unui Date UTC.
  for (let i = 0; i < 8; i++) {
    const probe = new Date(from.getTime() + i * 24 * 3600 * 1000);
    const local = parseLocalParts(probe);
    if (local.weekday !== weekday) continue;

    // Construim Date-ul UTC corespunzător orei locale (hh:mm) la Chișinău în
    // ziua găsită. Folosim diferența între parsLocalParts și UTC pt a obține offset-ul.
    const candidate = makeUtcFromLocal(local.year, local.month, local.day, hh, mm);
    if (candidate.getTime() >= from.getTime()) return candidate;
  }
  // Fallback: nu ar trebui să se întâmple — returnează una săptămâna viitoare.
  const fallback = new Date(from.getTime() + 7 * 24 * 3600 * 1000);
  return fallback;
}

/**
 * Următoarele `count` plecări la weekday/time setat în țară, începând din `from`.
 */
export function nextDepartures(
  weekday: number,
  time: string,
  count: number,
  from: Date = new Date()
): Date[] {
  const first = nextOccurrence(weekday, time, from);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(new Date(first.getTime() + i * 7 * 24 * 3600 * 1000));
  }
  return out;
}

/**
 * Sosirea estimată = plecare + durata (ore).
 */
export function arrivalFor(departure: Date, durationHours: number): Date {
  return new Date(departure.getTime() + durationHours * 3600 * 1000);
}

/* ---------- internal: timezone math ---------- */

function parseLocalParts(d: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun..6=Sat
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

/**
 * Construiește un Date UTC astfel încât în Europe/Chisinau el să apară ca
 * `year-month-day hour:minute`. Folosim ajustarea iterativă cu offset-ul TZ.
 */
function makeUtcFromLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  // Estimare inițială: tratăm componentele ca UTC, apoi corectăm cu offset-ul TZ-ului.
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = tzOffsetMs(guess);
  let actual = new Date(guess.getTime() - offsetMs);
  // O ajustare suplimentară pentru cazurile cu DST în jurul ferestrei.
  const offsetMs2 = tzOffsetMs(actual);
  if (offsetMs2 !== offsetMs) {
    actual = new Date(guess.getTime() - offsetMs2);
  }
  return actual;
}

/**
 * Offset-ul TZ pentru un Date (ms). Negativ pentru zone vest de UTC.
 * Pentru Chișinău (UTC+2/+3), offset-ul e +7200000 sau +10800000.
 */
function tzOffsetMs(d: Date): number {
  const local = parseLocalParts(d);
  const asIfUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    0
  );
  return asIfUtc - d.getTime();
}
