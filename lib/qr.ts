import QRCode from "qrcode";

export function ticketUrl(bookingNumber: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/bilet/${bookingNumber}`;
}

export function qrPngUrl(bookingNumber: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/tickets/${bookingNumber}/qr.png`;
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
