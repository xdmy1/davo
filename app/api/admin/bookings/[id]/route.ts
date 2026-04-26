import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueForBooking, cancelForBooking } from '@/lib/emailQueue'
import { autoLinkTripAndClient } from '@/lib/bookingLink'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const previous = await prisma.booking.findUnique({ where: { id } })
    if (!previous) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 })
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { ...body, updatedAt: new Date() },
    })

    // Tranziție de status → acțiuni automate pe coada de emailuri.
    if (body.status && body.status !== previous.status) {
      if (body.status === 'confirmed') {
        await prisma.booking.update({
          where: { id },
          data: { confirmedAt: previous.confirmedAt ?? new Date() },
        })
        await autoLinkTripAndClient(id)
        await enqueueForBooking(id)
      } else if (body.status === 'cancelled') {
        await cancelForBooking(id)
      }
    }

    return NextResponse.json({ success: true, booking })
  } catch (error) {
    console.error('Admin update booking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action } = await request.json()

    if (action === 'resend-email') {
      const { sendBookingConfirmation } = await import('@/lib/email')
      const booking = await prisma.booking.findUnique({ where: { id } })

      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        )
      }

      await sendBookingConfirmation({
        bookingNumber: booking.bookingNumber,
        type: booking.type as 'passenger' | 'parcel',
        tripType: booking.tripType as 'one-way' | 'round-trip',
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: booking.email,
        phone: booking.phone,
        departureCity: booking.departureCity,
        arrivalCity: booking.arrivalCity,
        departureDate: booking.departureDate,
        returnDate: booking.returnDate,
        adults: booking.adults,
        children: booking.children,
        parcelDetails: booking.parcelDetails,
        price: booking.price,
        currency: booking.currency,
        ticketUrl: booking.ticketUrl || ''
      })

      await prisma.booking.update({
        where: { id },
        data: { emailSent: true, emailSentAt: new Date() }
      })

      return NextResponse.json({ success: true, message: 'Email sent' })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Admin action error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    )
  }
}
