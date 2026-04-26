import { Resend } from "resend";
import type { Booking, EmailJob } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";
import {
  reminder24hHtml,
  reminder2hHtml,
  cancellationHtml,
  subjectForType,
} from "@/lib/emailTemplates";
import { createBookingToken, bookingResponseUrl } from "@/lib/bookingToken";

async function buildResponseUrls(bookingNumber: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const [confirmToken, cancelToken] = await Promise.all([
      createBookingToken(bookingNumber, "confirm"),
      createBookingToken(bookingNumber, "cancel"),
    ]);
    return {
      confirmUrl: bookingResponseUrl(appUrl, bookingNumber, "confirm", confirmToken),
      cancelUrl: bookingResponseUrl(appUrl, bookingNumber, "cancel", cancelToken),
      trackUrl: `${appUrl.replace(/\/$/, "")}/livrare?nr=${bookingNumber}`,
    };
  } catch {
    // SESSION_SECRET lipsește — emailul merge oricum, doar fără butoane V/X
    return { confirmUrl: undefined, cancelUrl: undefined, trackUrl: undefined };
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15 * 60 * 1000;

/**
 * Când un booking este confirmat: enqueue 3 emailuri (confirmation now,
 * reminder_24h la dep-24h, reminder_2h la dep-2h).
 * Skipează tipurile care există deja pentru booking-ul respectiv.
 * Reminderele din trecut nu se creează.
 */
export async function enqueueForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { enqueued: 0 };

  const existing = await prisma.emailJob.findMany({
    where: { bookingId, status: { notIn: ["cancelled", "failed"] } },
    select: { type: true },
  });
  const have = new Set(existing.map((e) => e.type));

  const now = new Date();
  const dep = booking.departureDate;
  const dep24 = new Date(dep.getTime() - 24 * 3600 * 1000);
  const dep2 = new Date(dep.getTime() - 2 * 3600 * 1000);

  const jobs: Array<{ type: string; sendAt: Date; status: string }> = [];
  if (!have.has("confirmation")) {
    jobs.push({ type: "confirmation", sendAt: now, status: "queued" });
  }
  if (!have.has("reminder_24h") && dep24 > now) {
    jobs.push({ type: "reminder_24h", sendAt: dep24, status: "scheduled" });
  }
  if (!have.has("reminder_2h") && dep2 > now) {
    jobs.push({ type: "reminder_2h", sendAt: dep2, status: "scheduled" });
  }

  if (jobs.length === 0) return { enqueued: 0 };

  await prisma.emailJob.createMany({
    data: jobs.map((j) => ({ ...j, bookingId })),
  });

  return { enqueued: jobs.length };
}

/**
 * Variantă a enqueueForBooking care sare peste `confirmation` — folosită când
 * flow-ul public trimite confirmation-ul inline, deci vrem doar reminderele.
 */
export async function enqueueRemindersOnly(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { enqueued: 0 };

  const existing = await prisma.emailJob.findMany({
    where: { bookingId, status: { notIn: ["cancelled", "failed"] } },
    select: { type: true },
  });
  const have = new Set(existing.map((e) => e.type));

  const now = new Date();
  const dep = booking.departureDate;
  const dep24 = new Date(dep.getTime() - 24 * 3600 * 1000);
  const dep2 = new Date(dep.getTime() - 2 * 3600 * 1000);

  const jobs: Array<{ type: string; sendAt: Date; status: string; bookingId: string }> = [];
  if (!have.has("reminder_24h") && dep24 > now) {
    jobs.push({ type: "reminder_24h", sendAt: dep24, status: "scheduled", bookingId });
  }
  if (!have.has("reminder_2h") && dep2 > now) {
    jobs.push({ type: "reminder_2h", sendAt: dep2, status: "scheduled", bookingId });
  }
  if (jobs.length > 0) {
    await prisma.emailJob.createMany({ data: jobs });
  }
  return { enqueued: jobs.length };
}

/**
 * Când un booking este anulat: marchează jobs-urile neexpediate ca 'cancelled'
 * și enqueue un email de cancellation dacă n-a fost deja trimis unul.
 */
export async function cancelForBooking(bookingId: string, sendCancellationEmail = true) {
  await prisma.emailJob.updateMany({
    where: { bookingId, status: { in: ["scheduled", "queued"] } },
    data: { status: "cancelled" },
  });

  if (sendCancellationEmail) {
    const alreadySent = await prisma.emailJob.findFirst({
      where: { bookingId, type: "cancellation", status: { in: ["sent", "queued"] } },
    });
    if (!alreadySent) {
      await prisma.emailJob.create({
        data: {
          bookingId,
          type: "cancellation",
          sendAt: new Date(),
          status: "queued",
        },
      });
    }
  }
}

/**
 * Procesează coada — ia toate job-urile due (scheduled cu sendAt<=now sau queued),
 * le trimite via Resend, actualizează statusul și creează EmailLog.
 * Folosită de /api/cron/send-reminders și /api/admin/emails/run.
 */
export async function processEmailQueue(limit = 50): Promise<{
  processed: number;
  sent: number;
  failed: number;
  retried: number;
}> {
  const now = new Date();
  const jobs = await prisma.emailJob.findMany({
    where: {
      OR: [
        { status: "scheduled", sendAt: { lte: now } },
        { status: "queued" },
      ],
    },
    include: { booking: true },
    orderBy: { sendAt: "asc" },
    take: limit,
  });

  const results = { processed: 0, sent: 0, failed: 0, retried: 0 };

  for (const job of jobs) {
    results.processed++;
    try {
      await sendJob(job);
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          attempts: job.attempts + 1,
          lastError: null,
        },
      });
      await prisma.emailLog.create({
        data: {
          to: job.booking.email,
          subject: subjectForType(job.type, job.booking.bookingNumber),
          template: job.type,
          status: "sent",
          relatedId: job.bookingId,
        },
      });
      results.sent++;
    } catch (error) {
      const attempts = job.attempts + 1;
      const maxed = attempts >= MAX_ATTEMPTS;
      const msg = (error instanceof Error ? error.message : String(error)).slice(0, 500);

      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          attempts,
          status: maxed ? "failed" : "queued",
          lastError: msg,
          sendAt: maxed ? job.sendAt : new Date(Date.now() + RETRY_DELAY_MS),
        },
      });
      await prisma.emailLog.create({
        data: {
          to: job.booking.email,
          subject: subjectForType(job.type, job.booking.bookingNumber),
          template: job.type,
          status: "failed",
          relatedId: job.bookingId,
          error: msg,
        },
      });
      if (maxed) results.failed++;
      else results.retried++;
    }
  }

  return results;
}

async function sendJob(job: EmailJob & { booking: Booking }) {
  const { type, booking } = job;
  const urls = await buildResponseUrls(booking.bookingNumber);

  if (type === "confirmation") {
    const result = await sendBookingConfirmation({
      bookingNumber: booking.bookingNumber,
      type: booking.type as "passenger" | "parcel",
      tripType: (booking.tripType as "one-way" | "round-trip" | undefined) ?? undefined,
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
      ticketUrl: booking.ticketUrl || "",
      payMethod: booking.payMethod,
      confirmUrl: urls.confirmUrl,
      cancelUrl: urls.cancelUrl,
      trackUrl: urls.trackUrl,
    });
    if (!result.success) throw new Error(result.error || "Resend failed");
    return;
  }

  const html =
    type === "reminder_24h"
      ? reminder24hHtml(booking, urls)
      : type === "reminder_2h"
      ? reminder2hHtml(booking, urls)
      : cancellationHtml(booking);

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "DAVO Group <info@davo.md>",
    to: booking.email,
    subject: subjectForType(type, booking.bookingNumber),
    html,
  });
  if (error) throw new Error(error.message || "Resend returned error");
}
