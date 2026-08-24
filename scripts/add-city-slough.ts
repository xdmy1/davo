/**
 * Adaugă orașul Slough (Anglia) în DB: City + rutele Chișinău ⇄ Slough.
 * Prețul și moneda sunt copiate de pe ruta existentă Chișinău → London
 * (sursa de adevăr e DB-ul, nu lib/data.ts — adminul poate să fi editat).
 * Idempotent — upsert peste tot, se poate rula de câte ori e nevoie.
 *
 * Usage: npx tsx scripts/add-city-slough.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const anglia = await prisma.country.findUnique({ where: { slug: "anglia" } });
  if (!anglia) throw new Error("Țara Anglia nu există în DB");

  const chisinau = await prisma.city.findUnique({ where: { slug: "chisinau" } });
  if (!chisinau) throw new Error("Orașul Chișinău nu există în DB");

  const slough = await prisma.city.upsert({
    where: { slug: "slough" },
    update: { name: "Slough", countryId: anglia.id, isOrigin: false },
    create: { name: "Slough", slug: "slough", isOrigin: false, countryId: anglia.id },
  });
  console.log(`✓ City: Slough (${slough.id})`);

  // Referință de preț: ruta Chișinău → London (fallback: 120 GBP).
  const london = await prisma.city.findUnique({ where: { slug: "london" } });
  const ref = london
    ? await prisma.route.findUnique({
        where: {
          originCityId_destinationCityId: {
            originCityId: chisinau.id,
            destinationCityId: london.id,
          },
        },
      })
    : null;
  const basePrice = ref?.basePrice ?? 120;
  const currency = ref?.currency ?? "GBP";

  for (const [origin, destination, label] of [
    [chisinau.id, slough.id, "Chișinău → Slough"],
    [slough.id, chisinau.id, "Slough → Chișinău"],
  ] as const) {
    await prisma.route.upsert({
      where: {
        originCityId_destinationCityId: {
          originCityId: origin,
          destinationCityId: destination,
        },
      },
      update: { active: true },
      create: {
        originCityId: origin,
        destinationCityId: destination,
        basePrice,
        currency,
        active: true,
        weeklyDepartures: 2,
      },
    });
    console.log(`✓ Route: ${label} — ${basePrice} ${currency}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
