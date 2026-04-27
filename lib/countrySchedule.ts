/**
 * Programul săptămânal afișat pe paginile SEO de țară (`/anglia`, `/belgia`,
 * etc.). Mirror-uit după valorile setate în `prisma/seed.ts` și editabile
 * din `/admin/countries`. Sursa de adevăr e DB-ul; aici e copia statică
 * pentru SSR rapid (paginile de țară sunt pre-rendered la build).
 *
 * Dacă admin editează programul în DB, paginile se regenerează la următorul
 * cycle ISR (revalidate=3600 pe paginile de țară). Pentru update imediat,
 * trigger un redeploy.
 */

const WEEKDAY_RO = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
] as const;

export type CountryScheduleRow = {
  outboundLabel: string; // ex: "Joi 10:00"
  outboundDuration: string; // ex: "~36h"
  returnLabel: string; // ex: "Duminică 19:00"
  returnDuration: string;
  fullSentence: string; // pentru meta description
};

const SCHEDULES: Record<string, CountryScheduleRow> = {
  anglia: {
    outboundLabel: "Joi 10:00",
    outboundDuration: "~36h",
    returnLabel: "Duminică 19:00",
    returnDuration: "~36h",
    fullSentence:
      "Plecare săptămânală joi la 10:00 din Chișinău (cu opriri în orașele din Moldova pe traseu), retur duminică la 19:00 din Anglia. Călătorie ~36h.",
  },
  belgia: {
    outboundLabel: "Vineri 08:30",
    outboundDuration: "~28h",
    returnLabel: "Duminică 12:00",
    returnDuration: "~28h",
    fullSentence:
      "Plecare săptămânală vineri la 08:30 din Chișinău, retur duminică la 12:00 din Belgia. Călătorie ~28h.",
  },
  olanda: {
    outboundLabel: "Vineri 08:30",
    outboundDuration: "~28h",
    returnLabel: "Duminică 12:00",
    returnDuration: "~28h",
    fullSentence:
      "Plecare săptămânală vineri la 08:30 din Chișinău, retur duminică la 12:00 din Olanda. Călătorie ~28h.",
  },
  germania: {
    outboundLabel: "Vineri 08:30",
    outboundDuration: "~28h",
    returnLabel: "Duminică 12:00",
    returnDuration: "~28h",
    fullSentence:
      "Plecare săptămânală vineri la 08:30 din Chișinău, retur duminică la 12:00 din Germania. Călătorie ~28h.",
  },
  luxemburg: {
    outboundLabel: "Joi 10:00",
    outboundDuration: "~28h",
    returnLabel: "Luni 07:00",
    returnDuration: "~28h",
    fullSentence:
      "Plecare săptămânală joi la 10:00 din Chișinău, retur luni la 07:00 dimineața din Luxemburg. Călătorie ~28h.",
  },
};

export function getCountrySchedule(slug: string): CountryScheduleRow | null {
  return SCHEDULES[slug] ?? null;
}

/**
 * Schema.org-style numbers pentru BusTrip JSON-LD: weekday code conform
 * `https://schema.org/DayOfWeek` (Sunday..Saturday).
 */
export function weekdayName(weekday: number): string {
  return WEEKDAY_RO[weekday] ?? "—";
}
