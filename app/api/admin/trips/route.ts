import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    // Default: viitoare + ultimele 30 zile. Cu 1500+ curse generate în orizont
    // de 8 săpt și retururile lor, fără filtru încărcam tot la fiecare deschidere
    // de pagină. Admin poate cere `scope=all` explicit dacă vrea.
    const scope = searchParams.get("scope") || "default";

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const where = scope === "all" ? {} : { departureAt: { gte: since } };

    const trips = await prisma.trip.findMany({
      where,
      orderBy: { departureAt: "asc" },
      take: 500,
      select: {
        id: true,
        routeId: true,
        busId: true,
        departureAt: true,
        arrivalAt: true,
        status: true,
        capacity: true,
        route: {
          select: {
            originCity: { select: { name: true } },
            destinationCity: { select: { name: true } },
          },
        },
        bus: { select: { label: true } },
        // Agregate de booking: numărăm doar cele confirmate, plus suma prețului.
        // Folosim _count + un al doilea aggregate, în loc să tragem rândurile.
      },
    });

    // Aggregate revenue/booked per-trip într-un singur query groupBy.
    const tripIds = trips.map((t) => t.id);
    const aggregates = tripIds.length
      ? await prisma.booking.groupBy({
          by: ["tripId"],
          where: { tripId: { in: tripIds }, status: "confirmed" },
          _count: { _all: true },
          _sum: { price: true },
        })
      : [];
    const byTrip = new Map(
      aggregates.map((a) => [
        a.tripId,
        { booked: a._count._all, revenue: a._sum.price ?? 0 },
      ])
    );

    return NextResponse.json({
      success: true,
      trips: trips.map((t) => {
        const agg = byTrip.get(t.id) ?? { booked: 0, revenue: 0 };
        return {
          id: t.id,
          routeId: t.routeId,
          routeLabel: `${t.route.originCity.name} → ${t.route.destinationCity.name}`,
          busId: t.busId,
          busLabel: t.bus.label,
          departureAt: t.departureAt.toISOString(),
          arrivalAt: t.arrivalAt.toISOString(),
          status: t.status,
          capacity: t.capacity,
          booked: agg.booked,
          revenue: agg.revenue,
        };
      }),
    });
  } catch (error) {
    console.error("admin/trips GET", error);
    return NextResponse.json({ success: false, error: "Failed to load trips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { routeId, busId, departureAt, arrivalAt, repeatWeekly, notes } = body as {
      routeId: string;
      busId: string;
      departureAt: string;
      arrivalAt: string;
      repeatWeekly?: number;
      notes?: string;
    };

    if (!routeId || !busId || !departureAt || !arrivalAt) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    const dep0 = new Date(departureAt);
    const arr0 = new Date(arrivalAt);
    const weeks = Math.max(0, Math.min(52, Number(repeatWeekly) || 0));

    const creates = [];
    for (let i = 0; i <= weeks; i++) {
      const dep = new Date(dep0);
      dep.setDate(dep.getDate() + 7 * i);
      const arr = new Date(arr0);
      arr.setDate(arr.getDate() + 7 * i);
      creates.push({
        routeId,
        busId,
        departureAt: dep,
        arrivalAt: arr,
        capacity: bus.totalSeats,
        status: "scheduled",
        notes: notes || null,
      });
    }

    const result = await prisma.trip.createMany({ data: creates });
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("admin/trips POST", error);
    return NextResponse.json({ success: false, error: "Failed to create trip" }, { status: 500 });
  }
}
