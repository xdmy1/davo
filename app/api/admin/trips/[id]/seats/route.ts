import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Detalii pe scaun pentru o cursă — folosit de modalul de rezervare manuală
 * ca să arate la click cine a rezervat un anumit loc. Strict admin (gardat
 * de proxy + lib/permissions: ambii admin1 și admin2 au acces).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seatBookings = await prisma.seatBooking.findMany({
      where: { tripId: id },
      orderBy: { seatNumber: "asc" },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      seats: seatBookings.map((s) => ({
        seatNumber: s.seatNumber,
        booking: s.booking
          ? {
              id: s.booking.id,
              bookingNumber: s.booking.bookingNumber,
              passengerName: `${s.booking.firstName} ${s.booking.lastName}`.trim(),
              phone: s.booking.phone,
              email: s.booking.email,
              status: s.booking.status,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("admin/trips/[id]/seats GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to load seats" },
      { status: 500 }
    );
  }
}
