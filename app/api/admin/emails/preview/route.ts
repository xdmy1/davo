import { NextRequest, NextResponse } from "next/server";
import type { Booking } from "@prisma/client";
import {
  confirmationHtml,
  reminder24hHtml,
  cancellationHtml,
  reviewRequestHtml,
  busChangeHtml,
  adminNotificationHtml,
  subjectForType,
  type ConfirmationData,
} from "@/lib/emailTemplates";
import { publicAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";

// Previzualizare cu DATE DE EXEMPLU pentru toate emailurile pe care le poate
// primi un client (plus notificarea de admin) — exact HTML-ul care pleacă prin
// Resend, fără să fie nevoie de o rezervare reală și fără să se trimită nimic.
//
// Usage: /api/admin/emails/preview?type=confirmation
// Pentru preview pe o rezervare REALĂ (cu tokenuri funcționale) există în
// continuare /api/admin/bookings/{DAVO-...}/preview-email.

const TYPES = [
  "confirmation",
  "confirmation_parcel",
  "reminder_24h",
  "review_request",
  "cancellation",
  "bus_change",
  "admin_notification",
] as const;
type PreviewType = (typeof TYPES)[number];

const TYPE_LABELS: Record<PreviewType, string> = {
  confirmation: "Confirmare",
  confirmation_parcel: "Confirmare colet",
  reminder_24h: "Reminder 24h",
  review_request: "Recenzie",
  cancellation: "Anulare",
  bus_change: "Autocar schimbat",
  admin_notification: "Notificare admin",
};

function sampleDates() {
  const departure = new Date();
  departure.setDate(departure.getDate() + 7);
  departure.setHours(7, 0, 0, 0);
  const ret = new Date(departure);
  ret.setDate(ret.getDate() + 14);
  return { departure, ret };
}

function sampleConfirmation(parcel: boolean): ConfirmationData {
  const { departure, ret } = sampleDates();
  return parcel
    ? {
        bookingNumber: "DAVO-2026-EXEMPLU",
        type: "parcel",
        firstName: "Maria",
        lastName: "Exemplu",
        departureCity: "Chișinău, Moldova",
        arrivalCity: "London, Anglia",
        departureDate: departure,
        adults: 1,
        children: 0,
        parcelDetails: "Colet 12 kg — haine și cadouri",
        price: 0,
        currency: "GBP",
        payMethod: "cash_on_delivery",
      }
    : {
        bookingNumber: "DAVO-2026-EXEMPLU",
        type: "passenger",
        tripType: "round-trip",
        firstName: "Maria, Ion",
        lastName: "Exemplu",
        departureCity: "Cahul, Moldova",
        arrivalCity: "London, Anglia",
        departureDate: departure,
        returnDate: ret,
        adults: 2,
        children: 1,
        price: 600,
        currency: "GBP",
        payMethod: "cash_on_pickup",
        departureTime: "07:00",
        returnTime: "19:00",
        busLabel: "Van Hool Astromega",
        busPlate: "DAW 777",
      };
}

// Booking „de jucărie" pentru template-urile care primesc direct modelul Prisma.
function sampleBooking(): Booking {
  const { departure, ret } = sampleDates();
  const c = sampleConfirmation(false);
  return {
    id: "sample",
    bookingNumber: c.bookingNumber,
    type: "passenger",
    status: "confirmed",
    tripType: "round-trip",
    departureCity: c.departureCity,
    arrivalCity: c.arrivalCity,
    departureDate: departure,
    returnDate: ret,
    firstName: c.firstName,
    lastName: c.lastName ?? "",
    email: "client@exemplu.md",
    phone: "+373 60 000 000",
    adults: c.adults,
    children: c.children,
    parcelWeight: null,
    parcelDetails: null,
    price: c.price,
    currency: c.currency,
    paymentStatus: "pending",
    payMethod: c.payMethod ?? null,
    paidAt: null,
    passengerResponse: null,
    passengerResponseAt: null,
    ticketUrl: `${publicAppUrl()}/bilet/${c.bookingNumber}`,
    qrCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: new Date(),
    emailSent: true,
    emailSentAt: new Date(),
    source: "site",
    manualBusId: null,
    createdById: null,
    createdByName: null,
    archivedAt: null,
    notes: null,
    furnizor: null,
    boardedAt: null,
    boardedBy: null,
    baggageSurplus: null,
    clientId: null,
    tripId: null,
    returnTripId: null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeParam = (searchParams.get("type") || "confirmation").toLowerCase();
  const type: PreviewType = (TYPES as readonly string[]).includes(typeParam)
    ? (typeParam as PreviewType)
    : "confirmation";

  const urls = {
    confirmUrl: "#preview-confirm",
    cancelUrl: "#preview-cancel",
  };

  let html: string;
  let subject: string;
  const booking = sampleBooking();

  switch (type) {
    case "confirmation_parcel": {
      html = confirmationHtml(sampleConfirmation(true), urls);
      subject = subjectForType("confirmation", booking.bookingNumber, "parcel");
      break;
    }
    case "reminder_24h": {
      html = reminder24hHtml(booking, urls, "07:00");
      subject = subjectForType("reminder_24h", booking.bookingNumber, "passenger");
      break;
    }
    case "review_request": {
      html = reviewRequestHtml(booking, `${publicAppUrl()}/recenzie?nr=${booking.bookingNumber}`);
      subject = subjectForType("review_request", booking.bookingNumber, "passenger");
      break;
    }
    case "cancellation": {
      html = cancellationHtml(booking);
      subject = subjectForType("cancellation", booking.bookingNumber, "passenger");
      break;
    }
    case "bus_change": {
      html = busChangeHtml({
        firstName: booking.firstName,
        departureCity: booking.departureCity,
        arrivalCity: booking.arrivalCity,
        departureDate: booking.departureDate,
        bookingNumber: booking.bookingNumber,
        busLabel: "MAN Lion's Coach",
        busPlate: "ZNQ 874",
        newSeats: "12, 13",
        seatChanged: true,
      });
      subject = `Autocar schimbat — ${booking.bookingNumber}`;
      break;
    }
    case "admin_notification": {
      html = adminNotificationHtml(sampleConfirmation(false));
      subject = `Rezervare nouă — ${booking.bookingNumber}`;
      break;
    }
    default: {
      html = confirmationHtml(sampleConfirmation(false), urls);
      subject = subjectForType("confirmation", booking.bookingNumber, "passenger");
    }
  }

  const tabs = TYPES.map(
    (t) =>
      `<a href="?type=${t}" style="color:white;background:rgba(255,255,255,0.1);padding:4px 10px;border-radius:4px;text-decoration:none;white-space:nowrap;font-weight:${t === type ? "700" : "400"};">${TYPE_LABELS[t]}</a>`
  ).join("");

  const banner = `
<div style="position:sticky;top:0;z-index:9999;background:#0b2653;color:white;padding:10px 16px;font-family:system-ui,sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-bottom:2px solid #e11e2b;">
  <div>
    <strong style="color:#ff7a85;">PREVIEW · DATE DE EXEMPLU</strong>
    · subiect: <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">${subject}</code>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;">${tabs}</div>
</div>
`;

  const withBanner = html.replace(/<body([^>]*)>/i, `<body$1>${banner}`);

  return new NextResponse(withBanner, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
