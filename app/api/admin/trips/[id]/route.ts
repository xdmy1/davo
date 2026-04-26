import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = new Set([
  "scheduled",
  "boarding",
  "en_route",
  "completed",
  "cancelled",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.busId !== undefined) data.busId = body.busId;

    const trip = await prisma.trip.update({ where: { id }, data });
    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error("admin/trips/[id] PATCH", error);
    return NextResponse.json({ success: false, error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingCount = await prisma.booking.count({ where: { tripId: id } });
    if (bookingCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cursa are ${bookingCount} rezervări. Anuleaz-o în loc să o ștergi.` },
        { status: 409 }
      );
    }
    await prisma.seatBooking.deleteMany({ where: { tripId: id } });
    await prisma.trip.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin/trips/[id] DELETE", error);
    return NextResponse.json({ success: false, error: "Failed to delete trip" }, { status: 500 });
  }
}
