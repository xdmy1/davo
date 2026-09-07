import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateGeo } from "@/lib/geo";
import { destinations } from "@/lib/data";

// Admin → Orașe: orașele de pornire (Moldova) și de sosire (țările străine).
// Sursa de adevăr e tabela City (partajată cu rezervari.davo.md) — site-ul și
// panoul operatorilor citesc de aici prin lib/geo.ts.
export const dynamic = "force-dynamic";

const MAX_NAME = 60;

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  if (!s || s.length > MAX_NAME) return null;
  // Numele e salvat pe rezervări ca „Oraș, Țară" — virgula ar strica parsarea.
  if (s.includes(",")) return null;
  return s;
}

function cleanNameRu(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, MAX_NAME) : null;
}

function cleanOffset(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < -1440 || n > 7 * 1440) return undefined;
  return n;
}

const KNOWN_COUNTRY_SLUGS = new Set(destinations.map((d) => d.slug));

function cleanPassengerCountries(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) return undefined;
  const out = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim().toLowerCase();
    if (KNOWN_COUNTRY_SLUGS.has(s)) out.add(s);
  }
  // Ordinea din `destinations` — stabilă în UI și în DB.
  return destinations.map((d) => d.slug).filter((s) => out.has(s));
}

function serializeCity(c: {
  id: string;
  name: string;
  nameRu: string | null;
  slug: string;
  isOrigin: boolean;
  sortOrder: number;
  active: boolean;
  pickupOffsetMin: number | null;
  passengerCountries: string[];
  _count?: { originRoutes: number; destinationRoutes: number };
}) {
  return {
    id: c.id,
    name: c.name,
    nameRu: c.nameRu,
    slug: c.slug,
    isOrigin: c.isOrigin,
    sortOrder: c.sortOrder,
    active: c.active,
    pickupOffsetMin: c.pickupOffsetMin,
    passengerCountries: c.passengerCountries,
    routeCount: (c._count?.originRoutes ?? 0) + (c._count?.destinationRoutes ?? 0),
  };
}

export async function GET() {
  try {
    const rows = await prisma.country.findMany({
      include: {
        cities: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: { _count: { select: { originRoutes: true, destinationRoutes: true } } },
        },
      },
    });
    const order = new Map(destinations.map((d, i) => [d.slug, i + 1]));
    const countries = rows
      .sort((a, b) => {
        const ia = a.slug === "moldova" ? 0 : order.get(a.slug) ?? 99;
        const ib = b.slug === "moldova" ? 0 : order.get(b.slug) ?? 99;
        return ia - ib || a.name.localeCompare(b.name);
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        flag: c.flag,
        isMoldova: c.slug === "moldova",
        cities: c.cities.map(serializeCity),
      }));
    return NextResponse.json({
      success: true,
      countries,
      destinationCountries: destinations.map((d) => ({ slug: d.slug, name: d.name })),
    });
  } catch (error) {
    console.error("admin/cities GET", error);
    return NextResponse.json({ success: false, error: "Nu s-au putut încărca orașele" }, { status: 500 });
  }
}

/** Prețul/moneda de referință pentru rutele unui oraș nou: ruta existentă a țării. */
async function referencePrice(countryId: string, countrySlug: string) {
  const ref = await prisma.route.findFirst({
    where: { active: true, destinationCity: { countryId } },
    orderBy: { createdAt: "asc" },
    select: { basePrice: true, currency: true, weeklyDepartures: true },
  });
  if (ref) return ref;
  const dest = destinations.find((d) => d.slug === countrySlug);
  return {
    basePrice: parseFloat(dest?.price || "") || 120,
    currency: dest?.currency === "£" ? "GBP" : "EUR",
    weeklyDepartures: 2,
  };
}

/** Rutele Chișinău ⇄ oraș (toate cursele trec prin Chișinău). Idempotent. */
async function ensureRoutesFor(cityId: string, countryId: string, countrySlug: string) {
  const chisinau = await prisma.city.findUnique({ where: { slug: "chisinau" }, select: { id: true } });
  if (!chisinau) return 0;
  const ref = await referencePrice(countryId, countrySlug);
  let created = 0;
  for (const [originCityId, destinationCityId] of [
    [chisinau.id, cityId],
    [cityId, chisinau.id],
  ] as const) {
    const existing = await prisma.route.findUnique({
      where: { originCityId_destinationCityId: { originCityId, destinationCityId } },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.route.create({
      data: {
        originCityId,
        destinationCityId,
        basePrice: ref.basePrice,
        currency: ref.currency,
        weeklyDepartures: ref.weeklyDepartures,
        active: true,
      },
    });
    created++;
  }
  return created;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = cleanName(body.name);
    if (!name) {
      return NextResponse.json({ success: false, error: "Numele orașului lipsește sau e invalid (fără virgule, max 60 caractere)." }, { status: 400 });
    }
    const countryId = typeof body.countryId === "string" ? body.countryId : "";
    const country = countryId ? await prisma.country.findUnique({ where: { id: countryId } }) : null;
    if (!country) {
      return NextResponse.json({ success: false, error: "Alege țara orașului." }, { status: 400 });
    }
    const isMoldova = country.slug === "moldova";

    // Nume unic în țară (tolerant la diacritice/majuscule).
    const siblings = await prisma.city.findMany({ where: { countryId: country.id }, select: { name: true, sortOrder: true } });
    const norm = (s: string) => slugify(s);
    if (siblings.some((s) => norm(s.name) === norm(name))) {
      return NextResponse.json({ success: false, error: `„${name}” există deja în ${country.name}.` }, { status: 409 });
    }

    // Slug unic global (City.slug e @unique).
    const base = slugify(name) || `oras-${Date.now()}`;
    let slug = base;
    for (let i = 2; await prisma.city.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${base}-${i}`;
    }

    const offset = cleanOffset(body.pickupOffsetMin);
    if (offset === undefined && body.pickupOffsetMin !== undefined) {
      return NextResponse.json({ success: false, error: "Offsetul trebuie să fie un număr întreg de minute." }, { status: 400 });
    }
    const passengerCountries = isMoldova ? cleanPassengerCountries(body.passengerCountries) ?? [] : [];
    const sortOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), -1) + 1;

    const city = await prisma.city.create({
      data: {
        name,
        slug,
        countryId: country.id,
        isOrigin: isMoldova,
        nameRu: cleanNameRu(body.nameRu) ?? null,
        pickupOffsetMin: offset ?? null,
        passengerCountries,
        active: body.active === undefined ? true : !!body.active,
        sortOrder,
      },
      include: { _count: { select: { originRoutes: true, destinationRoutes: true } } },
    });

    // Orașele străine au nevoie de rute Chișinău ⇄ oraș ca să apară curse;
    // cele MD sunt opriri pe cursa de Chișinău (alias în /api/public/trips).
    let routesCreated = 0;
    if (!isMoldova) routesCreated = await ensureRoutesFor(city.id, country.id, country.slug);

    revalidateGeo();
    return NextResponse.json({ success: true, city: serializeCity(city), routesCreated });
  } catch (error) {
    console.error("admin/cities POST", error);
    const msg = error instanceof Error ? error.message : "Nu s-a putut crea orașul";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    const city = id ? await prisma.city.findUnique({ where: { id }, include: { country: true } }) : null;
    if (!city) {
      return NextResponse.json({ success: false, error: "Orașul nu există." }, { status: 404 });
    }
    const isMoldova = city.country.slug === "moldova";
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (!name) {
        return NextResponse.json({ success: false, error: "Nume invalid (fără virgule, max 60 caractere)." }, { status: 400 });
      }
      if (name !== city.name) {
        const siblings = await prisma.city.findMany({
          where: { countryId: city.countryId, id: { not: city.id } },
          select: { name: true },
        });
        const dup = siblings.some((s) => slugify(s.name) === slugify(name));
        if (dup) {
          return NextResponse.json({ success: false, error: `„${name}” există deja în ${city.country.name}.` }, { status: 409 });
        }
        data.name = name;
      }
    }
    const nameRu = cleanNameRu(body.nameRu);
    if (nameRu !== undefined) data.nameRu = nameRu;
    if (body.active !== undefined) data.active = !!body.active;
    if (body.pickupOffsetMin !== undefined) {
      const offset = cleanOffset(body.pickupOffsetMin);
      if (offset === undefined) {
        return NextResponse.json({ success: false, error: "Offsetul trebuie să fie un număr întreg de minute." }, { status: 400 });
      }
      data.pickupOffsetMin = offset;
    }
    if (body.passengerCountries !== undefined) {
      const pc = cleanPassengerCountries(body.passengerCountries);
      if (pc === undefined) {
        return NextResponse.json({ success: false, error: "Lista de țări e invalidă." }, { status: 400 });
      }
      data.passengerCountries = isMoldova ? pc : [];
    }
    if (body.sortOrder !== undefined) {
      const n = Number(body.sortOrder);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ success: false, error: "Ordine invalidă." }, { status: 400 });
      }
      data.sortOrder = n;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Nimic de salvat." }, { status: 400 });
    }

    const updated = await prisma.city.update({
      where: { id: city.id },
      data,
      include: { _count: { select: { originRoutes: true, destinationRoutes: true } } },
    });

    // Reactivarea unui oraș străin: ne asigurăm că are rutele Chișinău ⇄ oraș.
    let routesCreated = 0;
    if (!isMoldova && data.active === true) {
      routesCreated = await ensureRoutesFor(city.id, city.countryId, city.country.slug);
    }

    revalidateGeo();
    return NextResponse.json({ success: true, city: serializeCity(updated), routesCreated });
  } catch (error) {
    console.error("admin/cities PATCH", error);
    const msg = error instanceof Error ? error.message : "Nu s-a putut salva orașul";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") ?? "";
    const city = id ? await prisma.city.findUnique({ where: { id }, include: { country: true } }) : null;
    if (!city) {
      return NextResponse.json({ success: false, error: "Orașul nu există." }, { status: 404 });
    }
    if (city.slug === "chisinau") {
      return NextResponse.json({ success: false, error: "Chișinău e hub-ul tuturor curselor și nu poate fi șters." }, { status: 400 });
    }

    const routes = await prisma.route.findMany({
      where: { OR: [{ originCityId: city.id }, { destinationCityId: city.id }] },
      select: { id: true },
    });
    const routeIds = routes.map((r) => r.id);

    if (routeIds.length > 0) {
      // Curse cu rezervări (locuri ocupate sau rezervări legate de cursă) → nu
      // ștergem; adminul poate dezactiva orașul ca să dispară de pe site.
      const [withSeats, withBookings, withReturn] = await Promise.all([
        prisma.trip.count({ where: { routeId: { in: routeIds }, seatBookings: { some: {} } } }),
        prisma.trip.count({ where: { routeId: { in: routeIds }, bookings: { some: {} } } }),
        prisma.trip.count({ where: { routeId: { in: routeIds }, returnBookings: { some: {} } } }),
      ]);
      const blocked = withSeats + withBookings + withReturn;
      if (blocked > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `„${city.name}” are curse cu rezervări (${blocked}). Dezactivează-l în loc să-l ștergi — dispare de pe site, iar rezervările rămân intacte.`,
          },
          { status: 409 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (routeIds.length > 0) {
        await tx.trip.deleteMany({ where: { routeId: { in: routeIds } } });
        await tx.route.deleteMany({ where: { id: { in: routeIds } } });
      }
      await tx.city.delete({ where: { id: city.id } });
    });

    revalidateGeo();
    return NextResponse.json({ success: true, routesDeleted: routeIds.length });
  } catch (error) {
    console.error("admin/cities DELETE", error);
    const msg = error instanceof Error ? error.message : "Nu s-a putut șterge orașul";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
