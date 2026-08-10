/**
 * Adaugă în DB noile opriri MD de îmbarcare pentru pasageri (spec operator,
 * aug 2026): Balabanu, Kongaz, Telenești, Sîngerei. Idempotent (upsert după
 * slug). Cursele nu au nevoie de altceva — API-ul public de trips alias-ează
 * orice oraș MD la Chișinău (hub).
 *
 * Usage:
 *   npx tsx scripts/add-md-boarding-stops.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const NEW_STOPS = [
  { name: "Balabanu", slug: "balabanu" },
  { name: "Kongaz", slug: "kongaz" },
  { name: "Telenești", slug: "telenesti" },
  { name: "Sîngerei", slug: "singerei" },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const moldova = await prisma.country.findUnique({ where: { slug: "moldova" } });
    if (!moldova) throw new Error("Țara 'moldova' nu există în DB — rulează seed-ul întâi.");

    for (const c of NEW_STOPS) {
      const city = await prisma.city.upsert({
        where: { slug: c.slug },
        update: { isOrigin: true },
        create: {
          name: c.name,
          slug: c.slug,
          isOrigin: true,
          countryId: moldova.id,
        },
      });
      console.log(`✓ ${city.name} (${city.slug}) — id ${city.id}`);
    }
    console.log("Gata.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
