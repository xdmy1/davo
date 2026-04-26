import { Resend } from "resend";
import {
  confirmationHtml,
  adminNotificationHtml,
  subjectForType,
  type ConfirmationData,
  type ResponseUrls,
} from "./emailTemplates";

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export interface BookingConfirmationData extends ConfirmationData {
  lastName: string;
  email: string;
  phone: string;
  ticketUrl: string;
  confirmUrl?: string;
  cancelUrl?: string;
  trackUrl?: string;
}

function urlsFrom(data: BookingConfirmationData): ResponseUrls | undefined {
  if (!data.confirmUrl || !data.cancelUrl) return undefined;
  return { confirmUrl: data.confirmUrl, cancelUrl: data.cancelUrl };
}

export async function sendBookingConfirmation(
  booking: BookingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const html = confirmationHtml(booking, urlsFrom(booking));

    const { error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || "DAVO Group <info@davo.md>",
      to: booking.email,
      subject: subjectForType("confirmation", booking.bookingNumber),
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendAdminNotification(
  booking: BookingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const html = adminNotificationHtml(booking);
    await getResend().emails.send({
      from: process.env.EMAIL_FROM || "DAVO Group <info@davo.md>",
      to: process.env.ADMIN_EMAIL || "admin@davo.md",
      subject: `Rezervare nouă — ${booking.bookingNumber}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Admin notification error:", error);
    return { success: false, error: "Failed to send admin notification" };
  }
}
