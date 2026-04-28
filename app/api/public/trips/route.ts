import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Cache la nivel de modul cu toate ID-urile orașelor moldovenești + Chișinău.
 * Setul nu se schimbă în runtime; îl populăm o singură dată pe instanța de
 * funcție și apoi alias-ul devine sincron, fără round-trip la DB.
 *
 * Față de DB-ul Supabase din eu-west-1 (care e la ~50 ms RTT minim), fiecare
 * query salvat înseamnă vizibil mai puțin timp de încărcare a ofertelor.
 */
let moldovaCachePromise: Promise<{
  ids: Set<string>;
  chisinauId: string | null;
}> | null = null;

function ensureMoldovaCache() {
  if (moldovaCachePromise) return moldovaCachePromise;
  moldovaCachePromise = prisma.city
    .findMany({
      where: { country: { slug: "moldova" } },
      select: { id: true, slug: true },
    })
    .then((cities) => ({
      ids: new Set(cities.map((c) => c.id)),
      chisinauId: cities.find((c) => c.slug === "chisinau")?.id ?? null,
    }))
    .catch((err) => {
      // Pe eroare resetăm cache-ul ca să încercăm din nou la următorul request.
      moldovaCachePromise = null;
      throw err;
    });
  return moldovaCachePromise;
}

/**
 * Toate cursele pleacă/sosesc la Chișinău (un singur autocar fizic). Dacă
 * userul caută cu un alt oraș moldovenesc ca origine sau destinație, alias-ăm
 * la Chișinău: aceleași curse apar, capacitatea e partajată corect, iar
 * autocarul oprește la celelalte orașe pe drum (pickup negociat cu operatorul
 * la rezervare).
 */
async function aliasBothToChisinau(originId: string, destId: string) {
  const { ids, chisinauId } = await ensureMoldovaCache();
  const alias = (id: string) =>
    ids.has(id) && chisinauId ? chisinauId : id;
  return { originCityId: alias(originId), destCityId: alias(destId) };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const rawOriginCityId = searchParams.get("originCityId");
    const rawDestCityId = searchParams.get("destCityId");
    const date = searchParams.get("date");
    const fromParam = searchParams.get("from");
    const limitParam = searchParams.get("limit");

    if (!rawOriginCityId || !rawDestCityId) {
      return NextResponse.json(
        { success: false, error: "originCityId, destCityId required" },
        { status: 400 }
      );
    }

    let dateRange: { gte: Date; lt?: Date };
    if (date) {
      const parts = date.split("-").map(Number);
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
        return NextResponse.json(
          { success: false, error: "date must be YYYY-MM-DD" },
          { status: 400 }
        );
      }
      const [y, mo, d] = parts;
      dateRange = {
        gte: new Date(y, mo - 1, d, 0, 0, 0, 0),
        lt: new Date(y, mo - 1, d + 1, 0, 0, 0, 0),
      };
    } else {
      const fromDate = fromParam ? new Date(fromParam) : new Date();
      if (Number.isNaN(fromDate.getTime())) {
        return NextResponse.json(
          { success: false, error: "from must be a valid date" },
          { status: 400 }
        );
      }
      dateRange = { gte: fromDate };
    }

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(limitParam) || DEFAULT_LIMIT)
    );

    // Alias: orice oraș MD → Chișinău, în ambele direcții (dus + retur).
    const { originCityId, destCityId } = await aliasBothToChisinau(
      rawOriginCityId,
      rawDestCityId
    );

    // Un singur round-trip: rută + curse + locuri rezervate, totul împreună.
    // Față de DB-ul Supabase din eu-west-1 fiecare query are latență de rețea,
    // așa că aici evităm round-trip-ul separat pentru `trips`.
    const route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId,
          destinationCityId: destCityId,
        },
      },
      select: {
        id: true,
        active: true,
        basePrice: true,
        currency: true,
        trips: {
          where: {
            departureAt: dateRange,
            status: { in: ["scheduled", "boarding"] },
          },
          orderBy: { departureAt: "asc" },
          take: date ? undefined : limit,
          select: {
            id: true,
            departureAt: true,
            arrivalAt: true,
            status: true,
            bus: { select: { id: true, label: true, totalSeats: true } },
            _count: { select: { seatBookings: true } },
          },
        },
      },
    });

    if (!route || !route.active) {
      return NextResponse.json({ success: true, route: null, trips: [] });
    }

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        basePrice: route.basePrice,
        currency: route.currency,
      },
      trips: route.trips.map((t) => {
        const booked = t._count.seatBookings;
        return {
          id: t.id,
          departureAt: t.departureAt.toISOString(),
          arrivalAt: t.arrivalAt.toISOString(),
          status: t.status,
          busId: t.bus.id,
          busLabel: t.bus.label,
          totalSeats: t.bus.totalSeats,
          bookedSeats: booked,
          availableSeats: t.bus.totalSeats - booked,
          pricePerSeat: route.basePrice,
          currency: route.currency,
        };
      }),
    });
  } catch (error) {
    console.error("public/trips GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load trips" },
      { status: 500 }
    );
  }
}
