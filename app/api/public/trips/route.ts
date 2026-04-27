import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

// Cache scurt — 30s fresh, 60s stale. Disponibilitatea locurilor se schimbă
// dinamic, dar cache-ul de 30s scoate sute de hituri DB la trafic mare.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const originCityId = searchParams.get("originCityId");
    const destCityId = searchParams.get("destCityId");
    const date = searchParams.get("date");
    const fromParam = searchParams.get("from");
    const limitParam = searchParams.get("limit");

    if (!originCityId || !destCityId) {
      return NextResponse.json(
        { success: false, error: "originCityId, destCityId required" },
        { status: 400 }
      );
    }

    const route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId,
          destinationCityId: destCityId,
        },
      },
      select: { id: true, active: true, basePrice: true, currency: true },
    });

    if (!route || !route.active) {
      return NextResponse.json(
        { success: true, route: null, trips: [] },
        { headers: CACHE_HEADERS }
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

    const trips = await prisma.trip.findMany({
      where: {
        routeId: route.id,
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
        busId: true,
        bus: { select: { label: true, totalSeats: true } },
        // _count returnează un singur INT din DB, evită deserializarea miilor
        // de SeatBooking rows doar ca să le numărăm.
        _count: { select: { seatBookings: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        route: {
          id: route.id,
          basePrice: route.basePrice,
          currency: route.currency,
        },
        trips: trips.map((t) => {
          const booked = t._count.seatBookings;
          return {
            id: t.id,
            departureAt: t.departureAt.toISOString(),
            arrivalAt: t.arrivalAt.toISOString(),
            status: t.status,
            busId: t.busId,
            busLabel: t.bus.label,
            totalSeats: t.bus.totalSeats,
            bookedSeats: booked,
            availableSeats: t.bus.totalSeats - booked,
            pricePerSeat: route.basePrice,
            currency: route.currency,
          };
        }),
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("public/trips GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load trips" },
      { status: 500 }
    );
  }
}
