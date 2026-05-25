import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { arrivalFor, nextDepartures } from "@/lib/schedule";

const HORIZON_WEEKS = 8;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * Cache la nivel de modul cu toate ID-urile orașelor moldovenești + Chișinău.
 * Setul nu se schimbă în runtime; îl populăm o singură dată pe instanța de
 * funcție și apoi alias-ul devine sincron, fără round-trip la DB.
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
      moldovaCachePromise = null;
      throw err;
    });
  return moldovaCachePromise;
}

/**
 * Toate cursele pleacă/sosesc la Chișinău. Dacă userul caută cu un alt oraș
 * moldovenesc ca origine sau destinație, alias-ăm la Chișinău.
 */
async function aliasBothToChisinau(originId: string, destId: string) {
  const { ids, chisinauId } = await ensureMoldovaCache();
  const alias = (id: string) =>
    ids.has(id) && chisinauId ? chisinauId : id;
  return { originCityId: alias(originId), destCityId: alias(destId) };
}

/**
 * Asigură că există Trip-uri în DB pentru fiecare ocurență din schedule
 * (până la HORIZON_WEEKS săptămâni înainte). Creează doar ce lipsește — pe cele
 * existente nu le atinge (poate au rezervări la ora veche după ce admin a
 * schimbat schedule-ul; ele rămân valide până la curățarea declanșată în PATCH).
 *
 * Schedule-ul Country e SURSA DE ADEVĂR — pagina publică afișează ce e în
 * schedule, nu ce-i pregenerat. Trip-urile vechi cu ora schimbată dispar din
 * picker (deși rămân în DB pentru bookings deja existente).
 */
async function ensureTripsForSchedule(params: {
  routeId: string;
  weekday: number;
  time: string;
  durationHours: number;
  from: Date;
}): Promise<void> {
  const { routeId, weekday, time, durationHours, from } = params;

  // Calculăm primele HORIZON_WEEKS ocurențe ale (weekday + time) după `from`.
  const expected = nextDepartures(weekday, time, HORIZON_WEEKS, from);
  if (expected.length === 0) return;

  // Vedem care există deja la timestamp-urile exacte calculate.
  const existing = await prisma.trip.findMany({
    where: {
      routeId,
      departureAt: { in: expected },
    },
    select: { departureAt: true },
  });
  const existingTimes = new Set(existing.map((t) => t.departureAt.getTime()));
  const missing = expected.filter((d) => !existingTimes.has(d.getTime()));
  if (missing.length === 0) return;

  // Avem nevoie de un autocar activ ca să atașăm capacitate. Folosim primul
  // (cel mai vechi) — consistent cu generatorul vechi.
  const bus = await prisma.bus.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, totalSeats: true },
  });
  if (!bus) return; // fără autocar configurat, nu putem oferi rezervări

  // createMany nu suportă skipDuplicates fără unique constraint, dar `missing`
  // e deja filtrat — duplicări concurrent sunt rare și ar fi acoperite de
  // următorul fetch (idempotent).
  await prisma.trip
    .createMany({
      data: missing.map((dep) => ({
        routeId,
        busId: bus.id,
        departureAt: dep,
        arrivalAt: arrivalFor(dep, durationHours),
        capacity: bus.totalSeats,
        status: "scheduled",
      })),
    })
    .catch((err) => {
      // Race condition (alt request a creat în paralel) — ignorăm, la următorul
      // fetch tot e în ordine.
      console.warn("ensureTripsForSchedule createMany:", err?.message ?? err);
    });
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

    const { originCityId, destCityId } = await aliasBothToChisinau(
      rawOriginCityId,
      rawDestCityId
    );

    // Includem ambele orașe + țările lor ca să decidem direcția (outbound vs return)
    // și să citim schedule-ul Country relevant.
    const route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId,
          destinationCityId: destCityId,
        },
      },
      include: {
        originCity: { include: { country: true } },
        destinationCity: { include: { country: true } },
      },
    });

    if (!route || !route.active) {
      return NextResponse.json({ success: true, route: null, trips: [] });
    }

    // Detectăm direcția: dacă origin = Moldova → outbound (folosim destCountry.outbound*);
    // dacă origin = țară străină → return (folosim originCountry.return*).
    const originIsMd = route.originCity.country.slug === "moldova";
    const foreignCountry = originIsMd ? route.destinationCity.country : route.originCity.country;
    const weekday = originIsMd ? foreignCountry.outboundWeekday : foreignCountry.returnWeekday;
    const time = originIsMd ? foreignCountry.outboundTime : foreignCountry.returnTime;
    const duration = originIsMd
      ? foreignCountry.outboundDurationHours
      : foreignCountry.returnDurationHours;

    // Dacă schedule-ul țării e setat și userul nu caută o dată specifică,
    // ne asigurăm că trip-urile pentru schedule-ul curent sunt create în DB.
    // Asta înlocuiește generatorul pre-cron — sursa de adevăr e schedule-ul,
    // nu trip-urile pregenerate.
    if (
      !date &&
      weekday !== null &&
      weekday !== undefined &&
      time &&
      duration &&
      duration > 0
    ) {
      await ensureTripsForSchedule({
        routeId: route.id,
        weekday,
        time,
        durationHours: duration,
        from: dateRange.gte,
      });
    }

    // Acum citim trip-urile care match perioada cerută.
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
        bus: { select: { id: true, label: true, totalSeats: true } },
        _count: { select: { seatBookings: true } },
      },
    });

    return NextResponse.json({
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
