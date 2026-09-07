/**
 * Ore de ridicare per oraș, pe ambele direcții (MD→EU și EU→MD).
 *
 * Modelul: fiecare țară are o oră-ancoră în DB (admin → Țări: outboundTime /
 * returnTime). Orașele sunt opriri pe aceeași cursă, în ordinea de mai jos,
 * fiecare cu un offset în MINUTE față de ancora direcției. Ora de ridicare a
 * unui oraș = ancora + offsetul lui.
 *
 * ⚠️ OFFSETURILE SUNT ESTIMĂRI (timpi de condus + opriri) — de confirmat de
 * operator. Ordinea MD e cea confirmată (lib/data.ts: sudul întâi, apoi
 * nordul); ordinea EU e dedusă din geografie (de la cel mai îndepărtat oraș
 * spre ieșirea din țară). Corectezi un oraș = schimbi UN număr aici.
 *
 * Tabelul complet se vede în /admin/orare.
 */

import { activeCities, mdStopsFor, type GeoData } from "@/lib/geoShared";

export type PickupStop = {
  city: string;
  /** minute față de ora-ancoră a direcției (0 = pleacă exact la ancoră); null = nesetat încă în admin → Orașe */
  offsetMin: number | null;
};

// ===== MD → EU: îmbarcarea prin Moldova =====
// Ancora = Country.outboundTime (plecarea din Chișinău).
// Ordine confirmată de operator: Chișinău → sudul (până la Cahul) → nordul.

const MD_SOUTH: PickupStop[] = [
  { city: "Chișinău", offsetMin: 0 },
  { city: "Ialoveni", offsetMin: 20 },
  { city: "Hîncești", offsetMin: 55 },
  { city: "Cimișlia", offsetMin: 100 },
  { city: "Comrat", offsetMin: 135 },
  { city: "Kongaz", offsetMin: 150 },
  { city: "Balabanu", offsetMin: 190 },
  { city: "Cahul", offsetMin: 230 },
];

const MD_NORTH: PickupStop[] = [
  // Orhei: readus în ofertă la 01.09.2026 — pe drumul din sud spre Telenești.
  { city: "Orhei", offsetMin: 395 },
  { city: "Telenești", offsetMin: 425 },
  { city: "Sîngerei", offsetMin: 465 },
  { city: "Bălți", offsetMin: 495 },
  { city: "Fălești", offsetMin: 530 },
  { city: "Ungheni", offsetMin: 580 },
];

/** Opririle MD per țară destinație, în ordinea rutei (chei = numele din destinations). */
export const MD_PICKUPS_BY_COUNTRY: Record<string, PickupStop[]> = {
  // Anglia iese prin sud (Cahul → Oancea) — doar bucla de sud.
  Anglia: MD_SOUTH,
  // Grupul Belgia/Germania/Olanda face sudul, apoi nordul, iese prin Ungheni.
  Belgia: [...MD_SOUTH, ...MD_NORTH],
  Germania: [...MD_SOUTH, ...MD_NORTH],
  Olanda: [...MD_SOUTH, ...MD_NORTH],
  Luxemburg: [...MD_SOUTH, ...MD_NORTH],
};

// ===== EU → MD: îmbarcarea prin țara străină (cursa de retur) =====
// Ancora = Country.returnTime = plecarea PRIMULUI oraș din listă (cel mai
// îndepărtat de ieșirea din țară); restul urmează cu offseturile lor.

export const EU_PICKUPS_BY_COUNTRY: Record<string, PickupStop[]> = {
  Anglia: [
    { city: "Manchester", offsetMin: 0 },
    { city: "Bolton", offsetMin: 30 },
    { city: "Stoke-on-Trent", offsetMin: 90 },
    { city: "Wolverhampton", offsetMin: 140 },
    { city: "Walsall", offsetMin: 160 },
    { city: "Dudley", offsetMin: 180 },
    { city: "Birmingham", offsetMin: 210 },
    { city: "Coventry", offsetMin: 250 },
    { city: "Rugby", offsetMin: 275 },
    { city: "Daventry", offsetMin: 295 },
    { city: "Northampton", offsetMin: 320 },
    { city: "Wellingborough", offsetMin: 345 },
    { city: "Kettering", offsetMin: 365 },
    { city: "Corby", offsetMin: 385 },
    { city: "Leicester", offsetMin: 425 },
    { city: "Nottingham", offsetMin: 460 },
    { city: "Boston", offsetMin: 520 },
    { city: "Spalding", offsetMin: 545 },
    { city: "King's Lynn", offsetMin: 580 },
    { city: "Peterborough", offsetMin: 620 },
    { city: "Huntingdon", offsetMin: 645 },
    { city: "Cambridge", offsetMin: 670 },
    { city: "Milton Keynes", offsetMin: 720 },
    { city: "Dunstable", offsetMin: 745 },
    { city: "Luton", offsetMin: 760 },
    { city: "Slough", offsetMin: 810 },
    { city: "Guildford", offsetMin: 850 },
    { city: "Crawley", offsetMin: 880 },
    { city: "London", offsetMin: 930 },
    { city: "Harlow", offsetMin: 960 },
    { city: "Chelmsford", offsetMin: 985 },
    { city: "Colchester", offsetMin: 1015 },
    { city: "Ipswich", offsetMin: 1040 },
    { city: "Basildon", offsetMin: 1080 },
    { city: "Southend-on-Sea", offsetMin: 1100 },
    { city: "Maidstone", offsetMin: 1140 },
    { city: "Ashford", offsetMin: 1165 },
    { city: "Canterbury", offsetMin: 1185 },
  ],
  Germania: [
    { city: "Osnabrück", offsetMin: 0 },
    { city: "Münster", offsetMin: 45 },
    { city: "Dortmund", offsetMin: 90 },
    { city: "Essen", offsetMin: 115 },
    { city: "Duisburg", offsetMin: 135 },
    { city: "Düsseldorf", offsetMin: 160 },
    { city: "Wuppertal", offsetMin: 190 },
    { city: "Köln", offsetMin: 225 },
    { city: "Bonn", offsetMin: 255 },
    { city: "Koblenz", offsetMin: 305 },
    { city: "Wiesbaden", offsetMin: 365 },
    { city: "Mainz", offsetMin: 380 },
    { city: "Frankfurt am Main", offsetMin: 415 },
    { city: "Offenbach am Main", offsetMin: 430 },
    { city: "Hanau", offsetMin: 445 },
    { city: "Darmstadt", offsetMin: 475 },
    { city: "Karlsruhe", offsetMin: 555 },
    { city: "Pforzheim", offsetMin: 580 },
    { city: "Würzburg", offsetMin: 690 },
    { city: "Nürnberg", offsetMin: 750 },
  ],
  Belgia: [
    { city: "Oostende", offsetMin: 0 },
    { city: "Brugge", offsetMin: 30 },
    { city: "Roeselare", offsetMin: 65 },
    { city: "Kortrijk", offsetMin: 90 },
    { city: "Tournai", offsetMin: 125 },
    { city: "Mons", offsetMin: 165 },
    { city: "La Louvière", offsetMin: 190 },
    { city: "Charleroi", offsetMin: 215 },
    { city: "Namur", offsetMin: 250 },
    { city: "Tubize", offsetMin: 300 },
    { city: "Anderlecht", offsetMin: 330 },
    { city: "Bruxelles", offsetMin: 345 },
    { city: "Asse", offsetMin: 365 },
    { city: "Aalst", offsetMin: 385 },
    { city: "Gent", offsetMin: 415 },
    { city: "Mechelen", offsetMin: 460 },
    { city: "Lier", offsetMin: 485 },
    { city: "Antwerpen", offsetMin: 505 },
    { city: "Herentals", offsetMin: 530 },
    { city: "Leuven", offsetMin: 565 },
    { city: "Hasselt", offsetMin: 600 },
    { city: "Liège", offsetMin: 635 },
  ],
  Olanda: [
    { city: "Amersfoort", offsetMin: 0 },
    { city: "Utrecht", offsetMin: 25 },
    { city: "Almere", offsetMin: 55 },
    { city: "Amsterdam", offsetMin: 80 },
    { city: "Haarlem", offsetMin: 105 },
    { city: "Leiden", offsetMin: 135 },
    { city: "Den Haag", offsetMin: 155 },
    { city: "Zoetermeer", offsetMin: 170 },
    { city: "Maasdijk", offsetMin: 190 },
    { city: "Schiedam", offsetMin: 205 },
    { city: "Rotterdam", offsetMin: 220 },
    { city: "Dordrecht", offsetMin: 245 },
    { city: "Breda", offsetMin: 275 },
    { city: "Tilburg", offsetMin: 300 },
    { city: "Eindhoven", offsetMin: 330 },
    { city: "Venlo", offsetMin: 380 },
  ],
  Luxemburg: [{ city: "Luxembourg City", offsetMin: 0 }],
};

// ===== Din DB (admin → Orașe) =====
// Când geografia vine din DB, opririle și offseturile se iau de acolo (adminul
// le editează în „Orașe"); tabelele statice de mai sus rămân fallback pentru
// orașele fără offset setat și pentru cazul în care DB nu răspunde.

const STATIC_MD_OFFSETS = new Map<string, number>(
  [...MD_SOUTH, ...MD_NORTH].map((s) => [s.city, s.offsetMin as number])
);

/** Opririle MD pentru o țară destinație, în ordinea configurată în admin. */
export function mdPickupsFor(geo: GeoData, countryName: string): PickupStop[] {
  if (!geo.fromDb) return MD_PICKUPS_BY_COUNTRY[countryName] ?? [];
  const byName = new Map((geo.moldova?.cities ?? []).map((c) => [c.name, c]));
  return mdStopsFor(geo, countryName).map((city) => ({
    city,
    offsetMin: byName.get(city)?.pickupOffsetMin ?? STATIC_MD_OFFSETS.get(city) ?? null,
  }));
}

/** Opririle din țara străină (cursa de retur), în ordinea offsetului (= ruta). */
export function euPickupsFor(geo: GeoData, countryName: string): PickupStop[] {
  if (!geo.fromDb) return EU_PICKUPS_BY_COUNTRY[countryName] ?? [];
  const country = geo.countries.find((c) => c.name === countryName);
  if (!country) return [];
  const staticOffsets = new Map(
    (EU_PICKUPS_BY_COUNTRY[countryName] ?? []).map((s) => [s.city, s.offsetMin as number])
  );
  const stops = activeCities(country).map((c) => ({
    city: c.name,
    offsetMin: c.pickupOffsetMin ?? staticOffsets.get(c.name) ?? null,
  }));
  // Orașele cu offset, crescător (ordinea rutei); cele fără offset la coadă.
  return stops.sort((a, b) => (a.offsetMin ?? Infinity) - (b.offsetMin ?? Infinity));
}

// ===== Calcul =====

export type ComputedStop = {
  city: string;
  offsetMin: number | null;
  /** "HH:mm" */
  time: string;
  /** câte zile după ziua ancorei (0 = aceeași zi, 1 = a doua zi…) */
  dayShift: number;
};

/** Adună offsetul peste ora-ancoră "HH:mm"; întoarce ora + în ce zi cade. */
export function computePickupTimes(
  anchorTime: string | null | undefined,
  stops: PickupStop[]
): ComputedStop[] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(anchorTime ?? "");
  const anchorMin = m ? Number(m[1]) * 60 + Number(m[2]) : null;
  return stops.map((s) => {
    if (anchorMin == null || s.offsetMin == null) {
      return { city: s.city, offsetMin: s.offsetMin, time: "—", dayShift: 0 };
    }
    const total = anchorMin + s.offsetMin;
    const dayShift = Math.floor(total / (24 * 60));
    const mins = total % (24 * 60);
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    return { city: s.city, offsetMin: s.offsetMin, time: `${hh}:${mm}`, dayShift };
  });
}

export const WEEKDAY_NAMES_RO = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
];

/** "Duminică" + shift zile → "Luni" etc. Null-safe pentru țări fără program. */
export function weekdayWithShift(weekday: number | null | undefined, dayShift: number): string {
  if (weekday == null) return "";
  return WEEKDAY_NAMES_RO[(weekday + dayShift) % 7] ?? "";
}
