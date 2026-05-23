import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await params

    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        // Includem scaunele cu tripId ca să putem grupa locurile pe dus/retur
        // în pagina /bilet/[bookingNumber] și în email-urile de confirmare.
        seatBookings: {
          select: { seatNumber: true, tripId: true },
          orderBy: { seatNumber: 'asc' },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    const outboundSeats = booking.seatBookings
      .filter((s) => s.tripId === booking.tripId)
      .map((s) => s.seatNumber)
    const returnSeats = booking.returnTripId
      ? booking.seatBookings
          .filter((s) => s.tripId === booking.returnTripId)
          .map((s) => s.seatNumber)
      : []

    const { seatBookings: _seatBookings, ...rest } = booking
    void _seatBookings
    return NextResponse.json({
      success: true,
      booking: { ...rest, outboundSeats, returnSeats },
    })
  } catch (error) {
    console.error('Get booking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get booking' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingNumber: string }> }
) {
  try {
    const { bookingNumber } = await params
    const body = await request.json()

    const booking = await prisma.booking.update({
      where: { bookingNumber },
      data: body
    })

    return NextResponse.json({ success: true, booking })
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}
