import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken } from "@/lib/bookingToken";

export const dynamic = "force-dynamic";

const fmtDate = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" });

// Primul pasager din listele unite cu ", " (numele precompletat pe recenzie).
function firstPassengerName(firstName: string, lastName: string): string {
  const f = firstName.split(",")[0]?.trim() ?? "";
  const l = lastName.split(",")[0]?.trim() ?? "";
  return `${f} ${l}`.trim();
}

async function authorize(nr: string, t: string) {
  if (!nr || !t) return null;
  const payload = await verifyBookingToken(t);
  if (!payload || payload.action !== "review" || payload.bookingNumber !== nr) return null;
  const booking = await prisma.booking.findUnique({
    where: { bookingNumber: nr },
    select: {
      id: true,
      bookingNumber: true,
      firstName: true,
      lastName: true,
      departureCity: true,
      arrivalCity: true,
      departureDate: true,
      status: true,
      review: { select: { rating: true, comment: true } },
    },
  });
  // Rezervările anulate nu lasă recenzii (tokenul de 120 zile rămâne altfel valid).
  if (booking?.status === "cancelled") return null;
  return booking;
}

// GET ?nr&t → datele precompletate pentru pagina de recenzie.
export async function GET(req: NextRequest) {
  const nr = (req.nextUrl.searchParams.get("nr") || "").trim().toUpperCase();
  const t = req.nextUrl.searchParams.get("t") || "";
  const booking = await authorize(nr, t);
  if (!booking) return NextResponse.json({ success: false, error: "Link invalid sau expirat" }, { status: 401 });

  return NextResponse.json({
    success: true,
    name: firstPassengerName(booking.firstName, booking.lastName),
    tripLabel: `${booking.departureCity} → ${booking.arrivalCity} · ${fmtDate.format(booking.departureDate)}`,
    existing: booking.review ?? null,
  });
}

// POST { nr, t, rating 1..5, comment? } → salvează recenzia (o poți și corecta).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const nr = String(body.nr || "").trim().toUpperCase();
  const t = String(body.t || "");
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";

  const booking = await authorize(nr, t);
  if (!booking) return NextResponse.json({ success: false, error: "Link invalid sau expirat" }, { status: 401 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ success: false, error: "Alege între 1 și 5 stele" }, { status: 400 });
  }

  const name = firstPassengerName(booking.firstName, booking.lastName);
  const tripLabel = `${booking.departureCity} → ${booking.arrivalCity} · ${fmtDate.format(booking.departureDate)}`;
  await prisma.review.upsert({
    where: { bookingId: booking.id },
    update: { rating, comment: comment || null },
    create: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      name,
      rating,
      comment: comment || null,
      tripLabel,
    },
  });

  return NextResponse.json({ success: true });
}
