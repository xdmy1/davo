import { PrismaClient } from "@prisma/client";
import { destinations, moldovanCities } from "../lib/data";

const prisma = new PrismaClient();

type SeatKind = "seat" | "aisle" | "wc" | "driver" | "empty";

function buildDefaultLayout(rows: number, cols: number) {
  const cells: SeatKind[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) cells.push("driver");
      else if (c === Math.floor(cols / 2)) cells.push("aisle");
      else if (r === rows - 1 && c === cols - 1) cells.push("wc");
      else cells.push("seat");
    }
  }
  return { rows, cols, cells };
}

function countSeats(cells: SeatKind[]) {
  return cells.filter((c) => c === "seat").length;
}

async function main() {
  console.log("→ Seed: Moldova country + origin cities");
  const moldova = await prisma.country.upsert({
    where: { slug: "moldova" },
    update: {},
    create: { name: "Moldova", slug: "moldova", flag: "🇲🇩" },
  });

  for (const c of moldovanCities) {
    await prisma.city.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        isOrigin: true,
        countryId: moldova.id,
      },
    });
  }

  console.log("→ Seed: destination countries + cities");
  const flagMap: Record<string, string> = {
    anglia: "🇬🇧",
    germania: "🇩🇪",
    belgia: "🇧🇪",
    olanda: "🇳🇱",
    luxemburg: "🇱🇺",
  };

  for (const dest of destinations) {
    const country = await prisma.country.upsert({
      where: { slug: dest.slug },
      update: { name: dest.name, flag: flagMap[dest.slug] ?? null },
      create: {
        name: dest.name,
        slug: dest.slug,
        flag: flagMap[dest.slug] ?? null,
      },
    });
    for (const city of dest.cities) {
      await prisma.city.upsert({
        where: { slug: city.slug },
        update: {},
        create: {
          name: city.name,
          slug: city.slug,
          isOrigin: false,
          countryId: country.id,
        },
      });
    }
  }

  console.log("→ Seed: Routes (Chișinău → fiecare destinație primară)");
  const chisinau = await prisma.city.findUnique({ where: { slug: "chisinau" } });
  if (!chisinau) throw new Error("Chișinău origin city missing");

  for (const dest of destinations) {
    const primaryCity = dest.cities[0];
    if (!primaryCity) continue;
    const destCity = await prisma.city.findUnique({ where: { slug: primaryCity.slug } });
    if (!destCity) continue;

    const currency = dest.currency === "£" ? "GBP" : "EUR";
    const price = Number(dest.price) || 100;

    await prisma.route.upsert({
      where: {
        originCityId_destinationCityId: {
          originCityId: chisinau.id,
          destinationCityId: destCity.id,
        },
      },
      update: {
        basePrice: price,
        currency,
        description: dest.description,
        seoSlug: dest.seoSlug,
        active: true,
      },
      create: {
        originCityId: chisinau.id,
        destinationCityId: destCity.id,
        basePrice: price,
        currency,
        description: dest.description,
        seoSlug: dest.seoSlug,
        active: true,
        weeklyDepartures: 2,
      },
    });
  }

  console.log("→ Seed: Autocare demo");
  const busesSeed = [
    { plate: "CJ 77 DAV", label: "Setra S 516 HD", model: "Setra ComfortClass", year: 2022, rows: 12, cols: 5 },
    { plate: "CJ 41 DAV", label: "MAN Lion's Coach", model: "MAN Lion's Coach RHC", year: 2021, rows: 13, cols: 5 },
    { plate: "MD 09 BUS", label: "Mercedes Tourismo", model: "Mercedes-Benz Tourismo RHD", year: 2020, rows: 12, cols: 5 },
  ];

  for (const b of busesSeed) {
    const layout = buildDefaultLayout(b.rows, b.cols);
    await prisma.bus.upsert({
      where: { plate: b.plate },
      update: {},
      create: {
        plate: b.plate,
        label: b.label,
        model: b.model,
        year: b.year,
        totalSeats: countSeats(layout.cells),
        layoutJson: JSON.stringify(layout),
        active: true,
      },
    });
  }

  const countries = await prisma.country.count();
  const cities = await prisma.city.count();
  const routes = await prisma.route.count();
  const buses = await prisma.bus.count();

  console.log("✔ Seed complet:");
  console.log(`   - ${countries} țări`);
  console.log(`   - ${cities} orașe`);
  console.log(`   - ${routes} rute`);
  console.log(`   - ${buses} autocare`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
