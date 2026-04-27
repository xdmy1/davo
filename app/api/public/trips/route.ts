import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Cache simplu cu ID-ul Chișinăului. Nu se schimbă niciodată — îl rezolvăm
 * o dată per instanță de funcție.
 */
let chisinauIdCache: string | null = null;
async function getChisinauId(): Promise<string | null> {
  if (chisinauIdCache) return chisinauIdCache;
  const c = await prisma.city.findUnique({
    where: { slug: "chisinau" },
    select: { id: true },
  });
  chisinauIdCache = c?.id ?? null;
  return chisinauIdCache;
}

/**
 * Toate cursele pleacă/sosesc la Chișinău (un singur autocar fizic). Dacă
 * userul caută cu un alt oraș moldovenesc ca origine sau destinație, alias-ăm
 * la Chișinău: aceleași curse apar, capacitatea e partajată corect, iar
 * autocarul oprește la celelalte orașe pe drum (pickup negociat cu operatorul
 * la rezervare).
 */
async function aliasMoldovaToChisinau(cityId: string): Promise<string> {
  const c = await prisma.city.findUnique({
    where: { id: cityId },
    select: { country: { select: { slug: true } } },
  });
  if (c?.country.slug !== "moldova") return cityId;
  const chisinauId = await getChisinauId();
  return chisinauId ?? cityId;
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

    // Alias: orice oraș MD → Chișinău, în ambele direcții (dus + retur).
    const [originCityId, destCityId] = await Promise.all([
      aliasMoldovaToChisinau(rawOriginCityId),
      aliasMoldovaToChisinau(rawDestCityId),
    ]);

    const route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId,
          destinationCityId: destCityId,
        },
      },
    });

    if (!route || !route.active) {
      return NextResponse.json({ success: true, route: null, trips: [] });
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

    const trips = await prisma.trip.findMany({
      where: {
        routeId: route.id,
        departureAt: dateRange,
        status: { in: ["scheduled", "boarding"] },
      },
      orderBy: { departureAt: "asc" },
      take: date ? undefined : limit,
      include: {
        bus: { select: { id: true, label: true, totalSeats: true } },
        seatBookings: { select: { id: true } },
      },
    });

    return NextResponse.json({
      success: true,
      route: {
        id: route.id,
        basePrice: route.basePrice,
        currency: route.currency,
      },
      trips: trips.map((t) => ({
        id: t.id,
        departureAt: t.departureAt.toISOString(),
        arrivalAt: t.arrivalAt.toISOString(),
        status: t.status,
        busId: t.bus.id,
        busLabel: t.bus.label,
        totalSeats: t.bus.totalSeats,
        bookedSeats: t.seatBookings.length,
        availableSeats: t.bus.totalSeats - t.seatBookings.length,
        pricePerSeat: route.basePrice,
        currency: route.currency,
      })),
    });
  } catch (error) {
    console.error("public/trips GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load trips" },
      { status: 500 }
    );
  }
}
