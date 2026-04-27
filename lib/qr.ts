import QRCode from "qrcode";
import { appUrl } from "@/lib/appUrl";

export function ticketUrl(bookingNumber: string): string {
  return `${appUrl()}/bilet/${bookingNumber}`;
}

export function qrPngUrl(bookingNumber: string): string {
  return `${appUrl()}/api/tickets/${bookingNumber}/qr.png`;
}

export async function generateQrPng(bookingNumber: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketUrl(bookingNumber), {
    errorCorrectionLevel: "M",
    width: 300,
    margin: 2,
    color: { dark: "#1f2937", light: "#ffffff" },
  });
}

export async function generateQrDataUrl(bookingNumber: string): Promise<string> {
  return QRCode.toDataURL(ticketUrl(bookingNumber), {
    errorCorrectionLevel: "M",
    width: 300,
    margin: 2,
    color: { dark: "#1f2937", light: "#ffffff" },
  });
}
