import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation, sendAdminNotification, BookingConfirmationData } from '@/lib/email'
import { calculatePrice, calculatePriceFromRoute, seatSurcharge } from '@/lib/pricing'
import { occupiedSeatsForRun } from '@/lib/runSeats'
import { autoLinkTripAndClient } from '@/lib/bookingLink'
import { enqueueRemindersOnly } from '@/lib/emailQueue'
import { createBookingToken, bookingResponseUrl } from '@/lib/bookingToken'
import { appUrl as resolveAppUrl, publicAppUrl } from '@/lib/appUrl'
import { computeSeatNumbers, isMultiDeck, type BusLayout } from '@/lib/adminMock'

function generateBookingNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `DAVO-${year}-${random}`
}

// Numerele REALE de pe harta autocarului, nu intervalul 1..număr de celule:
// seatStart/seatOverrides pot sări peste numere (ex. Altano DAW 077 are 54 de
// locuri numerotate până la 60), deci „loc valid" = e desenat pe hartă.
// Layout absent/corupt → acceptăm 1..totalSeats ca să nu blocăm vânzarea.
function validSeatNumbers(layoutJson: string, totalSeats: number): Set<number> {
  try {
    const layout = JSON.parse(layoutJson) as BusLayout
    const decks = isMultiDeck(layout) ? layout.decks.map((d) => d.layout) : [layout]
    const nums: number[] = []
    for (const d of decks) for (const n of computeSeatNumbers(d)) if (n != null) nums.push(n)
    if (nums.length > 0) return new Set(nums)
  } catch {}
  return new Set(Array.from({ length: Math.max(0, totalSeats) }, (_, i) => i + 1))
}

type TripWithRouteAndBus = Prisma.TripGetPayload<{
  include: { bus: true; route: { include: { originCity: true; destinationCity: true } } }
}>

type ValidationResult =
  | { ok: true; trip: TripWithRouteAndBus }
  | { ok: false; error: string }

async function validateTripSeats(tripId: string, seatNumbers: number[]): Promise<ValidationResult> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bus: true,
      route: { include: { originCity: true, destinationCity: true } },
    },
  })
  if (!trip) return { ok: false, error: 'Cursa nu a fost găsită' }
  if (!['scheduled', 'boarding'].includes(trip.status)) {
    return { ok: false, error: 'Cursa nu mai acceptă rezervări' }
  }
  const validSeats = validSeatNumbers(trip.bus.layoutJson, trip.bus.totalSeats)
  for (const n of seatNumbers) {
    if (!Number.isInteger(n) || !validSeats.has(n)) {
      return { ok: false, error: `Scaun invalid: ${n}` }
    }
  }
  if (new Set(seatNumbers).size !== seatNumbers.length) {
    return { ok: false, error: 'Scaune duplicate' }
  }
  // Backend = sursa de adevăr pentru ocupare: respinge locurile deja rezervate
  // pe ÎNTREAGA rulare fizică (toate trip-urile aceluiași autobuz din ziua aia),
  // chiar dacă harta din frontend e învechită. Vezi lib/runSeats.
  const taken = new Set(await occupiedSeatsForRun(tripId))
  const conflict = seatNumbers.filter((n) => taken.has(n))
  if (conflict.length > 0) {
    return { ok: false, error: `Locurile ${conflict.join(', ')} sunt deja rezervate. Alege altele.` }
  }
  return { ok: true, trip }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const requiredFields = ['type', 'departureCity', 'arrivalCity', 'departureDate', 'firstName', 'lastName', 'email', 'phone']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Lipsește câmpul: ${field}` },
          { status: 400 }
        )
      }
    }

    const tripId: string | undefined = body.tripId || undefined
    const returnTripId: string | undefined = body.returnTripId || undefined
    const seatNumbers: number[] = Array.isArray(body.seatNumbers)
      ? body.seatNumbers.map((n: unknown) => Number(n)).filter((n: number) => !Number.isNaN(n))
      : []
    const returnSeatNumbers: number[] = Array.isArray(body.returnSeatNumbers)
      ? body.returnSeatNumbers.map((n: unknown) => Number(n)).filter((n: number) => !Number.isNaN(n))
      : []

    const adults = Math.max(0, Number(body.adults) || 0)
    const children = Math.max(0, Number(body.children) || 0)
    const totalPassengers = body.type === 'passenger' ? Math.max(1, adults + children) : 0

    const payMethodRaw = typeof body.payMethod === 'string' ? body.payMethod : 'card'
    const payMethod = payMethodRaw === 'cash' ? 'cash_on_pickup' : 'card_on_pickup'

    if (tripId && seatNumbers.length !== totalPassengers) {
      return NextResponse.json(
        { success: false, error: `Alege ${totalPassengers} scaune pentru cursa dus` },
        { status: 400 }
      )
    }
    if (returnTripId && returnSeatNumbers.length !== totalPassengers) {
      return NextResponse.json(
        { success: false, error: `Alege ${totalPassengers} scaune pentru cursa retur` },
        { status: 400 }
      )
    }

    let outboundTrip: TripWithRouteAndBus | null = null
    let returnTrip: TripWithRouteAndBus | null = null

    if (tripId) {
      const v = await validateTripSeats(tripId, seatNumbers)
      if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 })
      outboundTrip = v.trip
    }
    if (returnTripId) {
      const v = await validateTripSeats(returnTripId, returnSeatNumbers)
      if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 })
      returnTrip = v.trip
    }

    let price: number
    let currency: string
    if (body.type === 'parcel') {
      // Colet: prețul îl stabilește operatorul la confirmare — NU tarifăm ca un
      // loc de pasager nici când coletul e legat de o cursă (înainte, un colet
      // cu tripId primea basePrice-ul rutei, ex. 150 EUR). 0 = „încă nesetat".
      price = 0
      currency = outboundTrip
        ? outboundTrip.route.currency
        : calculatePrice({
            departureCity: body.departureCity,
            arrivalCity: body.arrivalCity,
            type: 'parcel',
          }).currency
    } else if (outboundTrip) {
      const res = calculatePriceFromRoute({
        basePrice: outboundTrip.route.basePrice,
        currency: outboundTrip.route.currency,
        seats: totalPassengers,
        roundTrip: !!returnTripId,
      })
      price = res.price
      currency = res.currency
      // Locuri premium (ex. DAW 777: 1–8, 25–28 = +30/loc) — pe fiecare segment.
      price += seatSurcharge(outboundTrip.bus.plate, seatNumbers)
      if (returnTrip) price += seatSurcharge(returnTrip.bus.plate, returnSeatNumbers)
    } else {
      const res = calculatePrice({
        departureCity: body.departureCity,
        arrivalCity: body.arrivalCity,
        type: body.type,
        tripType: body.tripType,
        adults: body.adults,
        children: body.children,
        parcelWeight: body.parcelWeight,
      })
      price = res.price
      currency = res.currency
    }

    const bookingNumber = generateBookingNumber()

    let booking
    try {
      booking = await prisma.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            bookingNumber,
            type: body.type,
            tripType: body.tripType || 'one-way',
            departureCity: body.departureCity,
            arrivalCity: body.arrivalCity,
            departureDate: new Date(body.departureDate),
            returnDate: body.returnDate ? new Date(body.returnDate) : null,
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            notes: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
            phone: body.phone,
            adults: adults || 1,
            children,
            parcelWeight: body.parcelWeight || null,
            parcelDetails: body.parcelDetails || null,
            price,
            currency,
            payMethod,
            status: 'confirmed',
            confirmedAt: new Date(),
            tripId: tripId || null,
            returnTripId: returnTripId || null,
          },
        })
        if (tripId && seatNumbers.length > 0) {
          await tx.seatBooking.createMany({
            data: seatNumbers.map((n) => ({
              tripId,
              seatNumber: n,
              bookingId: b.id,
            })),
          })
        }
        if (returnTripId && returnSeatNumbers.length > 0) {
          await tx.seatBooking.createMany({
            data: returnSeatNumbers.map((n) => ({
              tripId: returnTripId,
              seatNumber: n,
              bookingId: b.id,
            })),
          })
        }
        return b
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Unul din scaunele alese a fost rezervat între timp. Te rog alege altele.',
          },
          { status: 409 }
        )
      }
      throw error
    }

    const appUrl = resolveAppUrl()
    // Linkul spre bilet e public (email, QR, buton pe pagina de succes) — folosim
    // `publicAppUrl` ca să nu ajungă niciodată la `localhost`.
    const ticketUrl = `${publicAppUrl()}/bilet/${booking.bookingNumber}`

    await prisma.booking.update({
      where: { id: booking.id },
      data: { ticketUrl }
    })

    try {
      await autoLinkTripAndClient(booking.id)
      await enqueueRemindersOnly(booking.id)
    } catch (e) {
      console.error('auto-link/enqueue after booking:', e)
    }

    const [confirmToken, cancelToken] = await Promise.all([
      createBookingToken(booking.bookingNumber, 'confirm'),
      createBookingToken(booking.bookingNumber, 'cancel'),
    ])

    const bookingData: BookingConfirmationData = {
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
      ticketUrl,
      payMethod: booking.payMethod,
      busLabel: outboundTrip?.bus.label ?? null,
      busPlate: outboundTrip?.bus.plate ?? null,
      confirmUrl: bookingResponseUrl(appUrl, booking.bookingNumber, 'confirm', confirmToken),
      cancelUrl: bookingResponseUrl(appUrl, booking.bookingNumber, 'cancel', cancelToken),
      trackUrl: `${appUrl.replace(/\/$/, '')}/livrare?nr=${booking.bookingNumber}`,
    }

    const emailResult = await sendBookingConfirmation(bookingData)
    await sendAdminNotification(bookingData)

    // Colete: trimitem cererea pe Telegram operatorului potrivit (după țara de
    // ridicare). Best-effort — nu blocăm rezervarea dacă Telegram nu e configurat.
    if (booking.type === 'parcel') {
      try {
        const { notifyParcelRequest } = await import('@/lib/telegram')
        await notifyParcelRequest({
          bookingNumber: booking.bookingNumber,
          departureCity: booking.departureCity,
          arrivalCity: booking.arrivalCity,
          name: `${booking.firstName} ${booking.lastName}`.trim(),
          phone: booking.phone,
          email: booking.email,
          parcelDetails: booking.parcelDetails,
          payMethod: booking.payMethod,
          ticketUrl,
        })
      } catch (e) {
        console.error('telegram parcel notify:', e)
      }
    }

    if (emailResult.success) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          emailSent: true,
          emailSentAt: new Date()
        }
      })
      await prisma.emailLog.create({
        data: {
          to: booking.email,
          subject: `Confirmare Rezervare DAVO - ${booking.bookingNumber}`,
          template: 'booking-confirmation',
          status: 'sent',
          relatedId: booking.id,
        }
      })
    } else {
      await prisma.emailLog.create({
        data: {
          to: booking.email,
          subject: `Confirmare Rezervare DAVO - ${booking.bookingNumber}`,
          template: 'booking-confirmation',
          status: 'failed',
          relatedId: booking.id,
          error: emailResult.error,
        }
      })
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        price: booking.price,
        currency: booking.currency,
        ticketUrl,
      },
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json(
      { success: false, error: 'Eroare la procesarea rezervării' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const bookingNumber = searchParams.get('bookingNumber')

    if (!email && !bookingNumber) {
      return NextResponse.json(
        { success: false, error: 'Email sau număr rezervare necesar' },
        { status: 400 }
      )
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { bookingNumber: bookingNumber || undefined }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, bookings })
  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { success: false, error: 'Eroare la obținerea rezervărilor' },
      { status: 500 }
    )
  }
}
