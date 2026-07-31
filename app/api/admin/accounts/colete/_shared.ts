// Parsarea corpurilor pentru rutele de colete.
//
// Fișier separat, cu prefixul „_" (deci scos din rutare), fiindcă Next respinge
// din `route.ts` orice export care nu e handler HTTP sau opțiune de segment.
//
// Aici se face DOAR traducerea din JSON în tipurile așteptate. Regulile („ce e
// un cod de țară valid", „start ≤ end", „ruta e unică per șofer") stau într-un
// singur loc, în `lib/coleteAdmin.ts`: patru rute care validează fiecare altfel
// ar însemna patru moduri diferite de a strica numerotarea coletelor.

import type { ColeteRole, ColeteRouteRangeInput } from "@/lib/coleteAdmin";

export const NECONFIGURAT =
  "Baza colete nu e configurată — adaugă COLETE_SUPABASE_URL și COLETE_SUPABASE_SERVICE_KEY în variabilele de mediu";

export function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Rolul e validat în `coleteAdmin` (un singur mesaj), aici doar se transportă. */
export function asRole(value: unknown): ColeteRole {
  return asText(value).trim() as ColeteRole;
}

// NaN, nu 0, pentru valorile lipsă sau neparsabile: `coleteAdmin` respinge NaN,
// dar ar accepta tăcut un zero inventat de noi.
export function asInt(value: unknown): number {
  if (typeof value === "number") return value;
  const text = asText(value).trim();
  return text ? Number(text) : NaN;
}

export function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/**
 * Listă de coduri de țară. Elementele rămân netraduse — `coleteAdmin` le
 * normalizează (majuscule, ordine, duplicate) și respinge ce nu e cod cunoscut.
 */
export function asCountryList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asText(item)) : [];
}

/**
 * `allowed_collection_countries` are TREI stări, nu două, iar diferența e
 * vizibilă în aplicația colete (`hasCollections = (lista?.length ?? 0) > 0`):
 *   • câmp absent  → nu se schimbă nimic (`undefined`);
 *   • `null`       → fără acces la Colectări;
 *   • listă        → acces doar pe țările din ea (lista goală = acces „pe nimic",
 *                    ceea ce practic închide secțiunea, dar e o alegere explicită
 *                    și se salvează ca atare).
 */
export function asCollectionCountries(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return asCountryList(value);
}

/** Un rând de interval din corpul cererii, fără validare (o face `coleteAdmin`). */
export function asRangeInput(value: unknown): ColeteRouteRangeInput {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    origin: asText(row.origin),
    destination: asText(row.destination),
    rangeStart: asInt(row.rangeStart),
    rangeEnd: asInt(row.rangeEnd),
  };
}

/** Descriere scurtă a unei rute pentru jurnal: „MD→NL 100–199". */
export function describeRange(range: {
  origin: string;
  destination: string;
  rangeStart: number;
  rangeEnd: number;
}): string {
  return `${range.origin}→${range.destination} ${range.rangeStart}–${range.rangeEnd}`;
}
