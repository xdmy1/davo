import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/email";
import { busChangeHtml } from "@/lib/emailTemplates";
import { computeSeatNumbers, isMultiDeck, type BusLayout, type SeatLayout } from "@/lib/adminMock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function seatNumbersOf(layoutJson: string): number[] {
  let l: BusLayout;
  try { l = JSON.parse(layoutJson); } catch { return []; }
  const out: number[] = [];
  const collect = (sl: SeatLayout) => { for (const n of computeSeatNumbers(sl)) if (n != null) out.push(n); };
  if (isMultiDeck(l)) l.decks.forEach((d) => collect(d.layout));
  else collect(l as SeatLayout);
  return out;
}
function isMD(c?: string | null): boolean { return /moldova/i.test(c ?? ""); }
function utcDayRange(d: Date): [Date, Date] {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return [start, new Date(start.getTime() + 24 * 3600 * 1000)];
}

// Schimbă autobuzul întregii CURSE FIZICE (toate rutele/orașele acelui autocar în
// ziua+direcția respectivă — ex. tot ce pleacă joi spre Anglia+Lux+Belgia), NU o
// singură rută. Remapează locurile TUTUROR pasagerilor (unic pe autobuzul fizic;
// același număr dacă există, altfel unul liber random) și, opțional, îi anunță pe
// toți prin email cu locul nou + scuze dacă s-a schimbat.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const busId = String(body.busId ?? "");
    const notify = body.notify !== false;

    const seed = await prisma.trip.findUnique({
      where: { id },
      select: {
        id: true, busId: true, departureAt: true,
        route: { select: { originCity: { select: { country: { select: { name: true } } } }, destinationCity: { select: { country: { select: { name: true } } } } } },
      },
    });
    if (!seed) return NextResponse.json({ success: false, error: "Cursă inexistentă" }, { status: 404 });

    const newBus = await prisma.bus.findUnique({ where: { id: busId }, select: { id: true, label: true, plate: true, layoutJson: true } });
    if (!newBus) return NextResponse.json({ success: false, error: "Autocar inexistent" }, { status: 400 });

    const seedInbound = isMD(seed.route?.destinationCity?.country?.name);
    const [dayStart, dayEnd] = utcDayRange(seed.departureAt);

    // Toate cursele aceleiași curse fizice: aceeași zi (UTC), același autobuz
    // curent, aceeași direcție (spre/dinspre Moldova).
    const candidates = await prisma.trip.findMany({
      where: { departureAt: { gte: dayStart, lt: dayEnd }, busId: seed.busId },
      select: {
        id: true,
        route: { select: { originCity: { select: { country: { select: { name: true } } } }, destinationCity: { select: { country: { select: { name: true } } } } } },
      },
    });
    const runTripIds = candidates
      .filter((t) => isMD(t.route?.destinationCity?.country?.name) === seedInbound)
      .map((t) => t.id);
    if (runTripIds.length === 0) return NextResponse.json({ success: false, error: "Nicio cursă în run" }, { status: 400 });

    const validSeats = seatNumbersOf(newBus.layoutJson);
    const validSet = new Set(validSeats);

    // Toate locurile din run (peste toate rutele) — remapate UNIC pe autobuzul fizic.
    const seatBk = await prisma.seatBooking.findMany({
      where: { tripId: { in: runTripIds } },
      orderBy: [{ seatNumber: "asc" }],
      include: { booking: { select: { id: true, email: true, firstName: true, bookingNumber: true, departureCity: true, arrivalCity: true, departureDate: true } } },
    });

    const claimed = new Set<number>();
    type Remap = { tripId: string; bookingId: string | null; booking: (typeof seatBk)[number]["booking"]; oldSeat: number; newSeat: number | null };
    const remap: Remap[] = [];
    for (const sb of seatBk) {
      let newSeat: number | null = null;
      if (validSet.has(sb.seatNumber) && !claimed.has(sb.seatNumber)) newSeat = sb.seatNumber;
      else { const free = validSeats.filter((n) => !claimed.has(n)); if (free.length) newSeat = free[Math.floor(Math.random() * free.length)]; }
      if (newSeat != null) claimed.add(newSeat);
      remap.push({ tripId: sb.tripId, bookingId: sb.bookingId, booking: sb.booking, oldSeat: sb.seatNumber, newSeat });
    }

    await prisma.$transaction(async (tx) => {
      await tx.trip.updateMany({ where: { id: { in: runTripIds } }, data: { busId, capacity: validSeats.length } });
      await tx.seatBooking.deleteMany({ where: { tripId: { in: runTripIds } } });
      const toCreate = remap.filter((r) => r.newSeat != null).map((r) => ({ tripId: r.tripId, seatNumber: r.newSeat as number, bookingId: r.bookingId }));
      if (toCreate.length) await tx.seatBooking.createMany({ data: toCreate });
    });

    const changed = remap.filter((r) => r.newSeat != null && r.newSeat !== r.oldSeat).length;
    const unseated = remap.filter((r) => r.newSeat == null).length;

    let emailsSent = 0, emailsFailed = 0;
    if (notify) {
      const byBooking = new Map<string, { booking: NonNullable<Remap["booking"]>; seats: Remap[] }>();
      for (const r of remap) {
        if (!r.booking || !r.bookingId) continue;
        const e = byBooking.get(r.bookingId) ?? { booking: r.booking, seats: [] };
        e.seats.push(r);
        byBooking.set(r.bookingId, e);
      }
      for (const { booking, seats } of byBooking.values()) {
        if (!booking.email) continue;
        const newSeats = seats.map((s) => (s.newSeat != null ? String(s.newSeat) : "va fi comunicat")).sort((a, b) => (parseInt(a) || 999) - (parseInt(b) || 999)).join(", ");
        const seatChanged = seats.some((s) => s.newSeat == null || s.newSeat !== s.oldSeat);
        const html = busChangeHtml({
          firstName: booking.firstName, departureCity: booking.departureCity, arrivalCity: booking.arrivalCity,
          departureDate: booking.departureDate, bookingNumber: booking.bookingNumber,
          busLabel: newBus.label, busPlate: newBus.plate, newSeats, seatChanged,
        });
        const subject = `Autocar schimbat — ${booking.bookingNumber}`;
        try {
          const { error } = await getResend().emails.send({ from: process.env.EMAIL_FROM || "DAVO Group <info@davo.md>", to: booking.email, subject, html });
          if (error) throw new Error(error.message);
          emailsSent++;
          await prisma.emailLog.create({ data: { to: booking.email, subject, template: "bus-change", status: "sent", relatedId: booking.id } }).catch(() => {});
        } catch (e) {
          emailsFailed++;
          await prisma.emailLog.create({ data: { to: booking.email, subject, template: "bus-change", status: "failed", relatedId: booking.id, error: (e instanceof Error ? e.message : String(e)).slice(0, 400) } }).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      success: true,
      busLabel: newBus.label,
      tripsChanged: runTripIds.length,
      passengers: remap.length,
      seatsKept: remap.length - changed - unseated,
      seatsChanged: changed,
      unseated,
      emailsSent,
      emailsFailed,
    });
  } catch (error) {
    console.error("admin/trips/[id]/change-bus", error);
    return NextResponse.json({ success: false, error: "Eroare la schimbarea autobuzului" }, { status: 500 });
  }
}
