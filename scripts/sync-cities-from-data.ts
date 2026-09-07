/**
 * Bootstrap (o singură dată) pentru admin → Orașe: aduce în tabela `City` tot ce
 * știau listele din cod — traducerea RU (dataI18n), ordinea (lib/data.ts),
 * offsetul pentru orar (lib/pickupTimes.ts) și țările destinație pentru care un
 * oraș MD se oferă pasagerilor (MD_STOPS_BY_COUNTRY).
 *
 * Idempotent și PRUDENT: creează orașele lipsă și completează DOAR câmpurile
 * încă nesetate (nameRu null, offset null, passengerCountries gol). Ordinea o
 * scrie doar dacă toată țara e încă la sortOrder 0 (adică n-a fost atinsă în
 * admin). Cu `--force` suprascrie tot din cod.
 *
 * `--hide-unlisted` (DOAR la prima rulare!): orașele care există în DB dar nu
 * și în listele din cod (ex. Stuttgart, München — seed vechi) devin ascunse
 * (active=false), ca site-ul să ofere exact ce oferea până acum; adminul le
 * reactivează din „Orașe" dacă vrea. NU repeta flag-ul după ce s-au adăugat
 * orașe din admin — le-ar ascunde și pe acelea.
 *
 * Usage:
 *   npx tsx scripts/sync-cities-from-data.ts [--force] [--dry] [--hide-unlisted]
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { destinations, moldovanCities, mdStopsForCountry } from "../lib/data";
import { cityNameI18n } from "../lib/i18n/dataI18n";
import { MD_PICKUPS_BY_COUNTRY, EU_PICKUPS_BY_COUNTRY } from "../lib/pickupTimes";

const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry");
const HIDE_UNLISTED = process.argv.includes("--hide-unlisted");

// Ordinea MD = ruta reală (sudul, apoi nordul) — lista grupului Belgia conține
// toate orașele oferite; cele scoase (Soroca, Edineț…) vin după, alfabetic.
const MD_ROUTE_ORDER = mdStopsForCountry("Belgia");

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Plan = {
  name: string;
  slug: string;
  countrySlug: string;
  isOrigin: boolean;
  sortOrder: number;
  nameRu: string | null;
  pickupOffsetMin: number | null;
  passengerCountries: string[];
};

function buildPlan(): Plan[] {
  const plans: Plan[] = [];

  // --- Moldova ---
  const mdOffsets = new Map<string, number>();
  for (const stops of Object.values(MD_PICKUPS_BY_COUNTRY)) {
    for (const s of stops) if (s.offsetMin != null) mdOffsets.set(s.city, s.offsetMin);
  }
  const mdAll = ["Chișinău", ...moldovanCities.map((c) => c.name)];
  const routeIdx = new Map(MD_ROUTE_ORDER.map((n, i) => [n, i]));
  const mdSorted = [...mdAll].sort((a, b) => {
    const ia = routeIdx.get(a) ?? 1000;
    const ib = routeIdx.get(b) ?? 1000;
    return ia - ib || a.localeCompare(b, "ro");
  });
  mdSorted.forEach((name, i) => {
    const staticCity = moldovanCities.find((c) => c.name === name);
    plans.push({
      name,
      slug: staticCity?.slug ?? slugify(name),
      countrySlug: "moldova",
      isOrigin: true,
      sortOrder: i,
      nameRu: cityNameI18n[name]?.ru ?? null,
      pickupOffsetMin: mdOffsets.get(name) ?? null,
      passengerCountries: destinations
        .filter((d) => mdStopsForCountry(d.name).includes(name))
        .map((d) => d.slug),
    });
  });

  // --- Țările străine ---
  for (const d of destinations) {
    const offsets = new Map((EU_PICKUPS_BY_COUNTRY[d.name] ?? []).map((s) => [s.city, s.offsetMin]));
    d.cities.forEach((c, i) => {
      plans.push({
        name: c.name,
        slug: c.slug,
        countrySlug: d.slug,
        isOrigin: false,
        sortOrder: i,
        nameRu: cityNameI18n[c.name]?.ru ?? null,
        pickupOffsetMin: offsets.get(c.name) ?? null,
        passengerCountries: [],
      });
    });
  }
  return plans;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const countries = await prisma.country.findMany({ include: { cities: true } });
    const bySlug = new Map(countries.map((c) => [c.slug, c]));
    const plans = buildPlan();
    let created = 0;
    let updated = 0;

    for (const country of countries) {
      const mine = plans.filter((p) => p.countrySlug === country.slug);
      if (mine.length === 0) continue;
      // Ordinea se scrie doar dacă țara n-a fost încă ordonată în admin.
      const untouchedOrder = country.cities.every((c) => c.sortOrder === 0);

      for (const p of mine) {
        const existing = country.cities.find((c) => c.slug === p.slug);
        if (!existing) {
          created++;
          console.log(`+ ${country.name}: ${p.name} (nou)`);
          if (!DRY) {
            await prisma.city.create({
              data: {
                name: p.name,
                slug: p.slug,
                isOrigin: p.isOrigin,
                countryId: country.id,
                sortOrder: p.sortOrder,
                nameRu: p.nameRu,
                pickupOffsetMin: p.pickupOffsetMin,
                passengerCountries: p.passengerCountries,
              },
            });
          }
          continue;
        }

        const data: Record<string, unknown> = {};
        if (FORCE || existing.nameRu == null) {
          if (p.nameRu !== existing.nameRu && p.nameRu != null) data.nameRu = p.nameRu;
        }
        if (FORCE || existing.pickupOffsetMin == null) {
          if (p.pickupOffsetMin != null && p.pickupOffsetMin !== existing.pickupOffsetMin) {
            data.pickupOffsetMin = p.pickupOffsetMin;
          }
        }
        if (FORCE || existing.passengerCountries.length === 0) {
          if (
            p.passengerCountries.length > 0 &&
            JSON.stringify(p.passengerCountries) !== JSON.stringify(existing.passengerCountries)
          ) {
            data.passengerCountries = p.passengerCountries;
          }
        }
        if ((FORCE || untouchedOrder) && existing.sortOrder !== p.sortOrder) {
          data.sortOrder = p.sortOrder;
        }
        if (Object.keys(data).length === 0) continue;
        updated++;
        console.log(`~ ${country.name}: ${p.name} ← ${JSON.stringify(data)}`);
        if (!DRY) await prisma.city.update({ where: { id: existing.id }, data });
      }
    }

    // Orașe din DB care nu-s în cod (seed vechi sau adăugate din admin).
    let hidden = 0;
    for (const country of countries) {
      const listed = plans.filter((p) => p.countrySlug === country.slug).length;
      const unlisted = country.cities
        .filter((c) => !plans.some((p) => p.slug === c.slug))
        .sort((a, b) => a.name.localeCompare(b.name, "ro"));
      for (const [i, c] of unlisted.entries()) {
        console.log(`  (doar în DB) ${country.name}: ${c.name}${c.active ? "" : " [inactiv]"}`);
        if (HIDE_UNLISTED && c.active) {
          hidden++;
          if (!DRY) {
            await prisma.city.update({
              where: { id: c.id },
              data: { active: false, sortOrder: listed + i },
            });
          }
        }
      }
    }
    if (HIDE_UNLISTED) console.log(`${hidden} orașe nelistate în cod → ascunse (active=false).`);
    if (!bySlug.has("moldova")) console.warn("⚠ Țara 'moldova' lipsește din DB — rulează seed-ul.");
    console.log(`${DRY ? "[dry] " : ""}Gata: ${created} create, ${updated} completate.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
