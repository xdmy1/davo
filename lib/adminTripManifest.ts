/**
 * Trimite un manifest pe email către admin cu ~24h înainte de fiecare cursă —
 * o singură dată per cursă (idempotent via EmailLog). Apelat din cron-ul zilnic
 * (/api/cron/send-reminders), după ce s-au procesat reminderele individuale ale
 * pasagerilor.
 */
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/email";
import { adminTripManifestHtml, type TripManifestData, type TripManifestPassenger } from "@/lib/emailTemplates";
import { resolveScheduledTimes } from "@/lib/scheduledTime";
import { tomorrowWindowMD, localTimeStringMD } from "@/lib/schedule";
import { appUrl as resolveAppUrl } from "@/lib/appUrl";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "adrian@radx.solutions";
const TEMPLATE_KEY = "admin-trip-manifest";

export type ManifestRunResult = {
  trips: number;
  sent: number;
  alreadySent: number;
  failed: number;
};

export async function processAdminTripManifests(now: Date = new Date()): Promise<ManifestRunResult> {
  const result: ManifestRunResult = { trips: 0, sent: 0, alreadySent: 0, failed: 0 };

  const { start, end } = tomorrowWindowMD(now);
  const trips = await prisma.trip.findMany({
    where: {
      departureAt: { gte: start, lt: end },
      status: { in: ["scheduled", "boarding"] },
    },
    include: {
      route: {
        include: {
          originCity: { include: { country: true } },
          destinationCity: { include: { country: true } },
        },
      },
      bus: true,
    },
    orderBy: { departureAt: "asc" },
  });

  result.trips = trips.length;

  for (const trip of trips) {
    // Idempotență: dacă deja am log de manifest reușit pe această cursă, sărim.
    const alreadyLogged = await prisma.emailLog.findFirst({
      where: { template: TEMPLATE_KEY, relatedId: trip.id, status: "sent" },
      select: { id: true },
    });
    if (alreadyLogged) {
      result.alreadySent++;
      continue;
    }

    try {
      await sendOne(trip);
      result.sent++;
    } catch (e) {
      console.error(`admin-trip-manifest trip=${trip.id}:`, e);
      result.failed++;
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      await prisma.emailLog.create({
        data: {
          to: ADMIN_EMAIL,
          subject: `DAVO admin manifest (eroare) — ${trip.id}`,
          template: TEMPLATE_KEY,
          status: "failed",
          relatedId: trip.id,
          error: msg,
        },
      });
    }
  }

  return result;
}

// Trigger manual pentru o cursă specifică (admin → buton "Trimite manifest").
// Nu verifică fereastra de 24h și nu validează statusul cursei — admin știe
// exact ce face când îl apasă. Cu `force: true` ignoră și idempotența.
export async function sendManifestForTrip(tripId: string, opts: { force?: boolean } = {}): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: {
        include: {
          originCity: { include: { country: true } },
          destinationCity: { include: { country: true } },
        },
      },
      bus: true,
    },
  });
  if (!trip) return { ok: false, reason: "Trip not found" };

  if (!opts.force) {
    const alreadyLogged = await prisma.emailLog.findFirst({
      where: { template: TEMPLATE_KEY, relatedId: trip.id, status: "sent" },
      select: { id: true },
    });
    if (alreadyLogged) return { ok: false, reason: "Already sent for this trip (use force to resend)" };
  }

  await sendOne(trip);
  return { ok: true };
}

type TripWithIncludes = Awaited<ReturnType<typeof prisma.trip.findMany>>[number] & {
  route: {
    originCity: { name: string; country: { name: string } };
    destinationCity: { name: string; country: { name: string } };
  };
  bus: { label: string; plate: string };
};

// Reutilizabil: extrage datele complete de manifest pentru o cursă. Folosit
// atât de email-ul de cron cât și de modalul "Vezi pasageri" din /admin/trips.
export async function getTripManifestData(tripId: string): Promise<TripManifestData | null> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: {
        include: {
          originCity: { include: { country: true } },
          destinationCity: { include: { country: true } },
        },
      },
      bus: true,
    },
  });
  if (!trip) return null;
  return buildManifest(trip);
}

async function buildManifest(trip: TripWithIncludes): Promise<TripManifestData> {
  const origin = trip.route.originCity.name;
  const originCountry = trip.route.originCity.country.name;
  const destination = trip.route.destinationCity.name;
  const destinationCountry = trip.route.destinationCity.country.name;

  // Ora locală a plecării: încercăm întâi schedule-ul țării (sursa pe care
  // admin-ul o setează în /admin/countries — vrem să arătăm acolo "07:00" /
  // "19:00" exact așa cum a tastat). Dacă rezolvarea eșuează (cursă fără
  // schedule sau direcție atipică) cădem pe ora locală a `departureAt`.
  let localTime: string;
  try {
    const scheduled = await resolveScheduledTimes({
      departureCity: `${origin}, ${originCountry}`,
      arrivalCity: `${destination}, ${destinationCountry}`,
      returnDate: null,
    });
    localTime = scheduled.departureTime ?? localTimeStringMD(trip.departureAt);
  } catch {
    localTime = localTimeStringMD(trip.departureAt);
  }

  // Pasagerii pe ACEASTĂ cursă (poate fi tripId sau returnTripId)
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ tripId: trip.id }, { returnTripId: trip.id }],
      status: { in: ["confirmed", "pending"] },
    },
    include: { seatBookings: { select: { tripId: true, seatNumber: true } } },
    orderBy: { createdAt: "asc" },
  });

  const passengers: TripManifestPassenger[] = bookings.map((b) => {
    const isParcel = b.type === "parcel" || b.type === "colet_la_cheie";
    const paxCount = isParcel ? 0 : Math.max(1, b.adults + b.children);
    const passengerNames = isParcel
      ? `${b.firstName} ${b.lastName} (colet)`
      : `${b.firstName} ${b.lastName}`;
    const seats = b.seatBookings
      .filter((s) => s.tripId === trip.id)
      .map((s) => s.seatNumber)
      .sort((a, c) => a - c);
    return {
      bookingNumber: b.bookingNumber,
      isParcel,
      passengerNames,
      phone: b.phone,
      email: b.email,
      arrivalCity: b.arrivalCity,
      seats,
      paxCount,
      price: b.price,
      currency: b.currency,
      payMethod: b.payMethod,
      parcelDetails: b.parcelDetails,
    };
  });

  // URL admin filtrat pe data curentă (admin/bookings are filtru date+country)
  const dateStr = formatDateMD(trip.departureAt);
  const adminUrl = `${resolveAppUrl().replace(/\/$/, "")}/admin/bookings?date=${encodeURIComponent(dateStr)}`;

  return {
    origin,
    originCountry,
    destination,
    destinationCountry,
    departureDate: trip.departureAt,
    localTime,
    busLabel: `${trip.bus.label} · ${trip.bus.plate}`,
    totalSeats: trip.capacity,
    passengers,
    adminUrl,
  };
}

async function sendOne(trip: TripWithIncludes) {
  const data = await buildManifest(trip);
  const subject = `🚌 Mâine ${data.localTime} · ${data.origin} → ${data.destination} · ${data.passengers.length} rezerv.`;
  const html = adminTripManifestHtml(data);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const { error } = await getResend().emails.send({
    from: process.env.EMAIL_FROM || "DAVO Group <info@davo.md>",
    to: ADMIN_EMAIL,
    subject,
    html,
  });
  if (error) throw new Error(error.message || "Resend returned error");

  await prisma.emailLog.create({
    data: {
      to: ADMIN_EMAIL,
      subject,
      template: TEMPLATE_KEY,
      status: "sent",
      relatedId: trip.id,
    },
  });
}

// YYYY-MM-DD în MD timezone — folosit ca filtru pe /admin/bookings
function formatDateMD(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
