// Notificare Telegram pentru cererile de colet. Ruta se decide după țara de
// RIDICARE (origine): Moldova → operator MD, Anglia → operator UK, iar
// Belgia/Olanda/Germania/Luxemburg → operator BE.
//
// Un bot de Telegram NU poate scrie unui număr de telefon — trimite către un
// `chat_id`. Fiecare operator (sau grup) pornește o conversație cu botul, iar
// chat_id-ul lui se pune în env. Numerele de pe site sunt doar eticheta rutării.
//
// Env necesare (Vercel): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_MOLDOVA,
// TELEGRAM_CHAT_ANGLIA, TELEGRAM_CHAT_BENELUX. Dacă lipsesc, trimiterea e no-op
// (nu blochează rezervarea).

import { destinations, moldovanCities } from "@/lib/data";

const norm = (s: string) => s.trim().toLowerCase();

export type OperatorGroup = "moldova" | "anglia" | "benelux";

// Țară (slug/nume normalizat) → grupul de operatori care primește cererea.
const COUNTRY_TO_GROUP: Record<string, OperatorGroup> = {
  moldova: "moldova",
  anglia: "anglia",
  belgia: "benelux",
  olanda: "benelux",
  germania: "benelux",
  luxemburg: "benelux",
};

// Deduce țara dintr-un string „Oraș, Țară" sau doar „Oraș" (unele colete au doar
// orașul salvat). Cade pe: sufix explicit de țară → oraș moldovenesc/Chișinău →
// căutare în lista de orașe-destinație.
export function countryOfCity(cityStr: string): string | null {
  if (!cityStr) return null;
  const parts = cityStr.split(",").map((s) => s.trim()).filter(Boolean);
  const tail = parts[parts.length - 1];
  if (tail && COUNTRY_TO_GROUP[norm(tail)]) return norm(tail);

  const cityName = norm(parts[0] || cityStr);
  if (cityName === "chișinău" || cityName === "chisinau") return "moldova";
  if (moldovanCities.some((c) => norm(c.name) === cityName)) return "moldova";
  const dest = destinations.find((d) => d.cities.some((c) => norm(c.name) === cityName));
  if (dest) return norm(dest.name);
  return null;
}

export function operatorGroupForOrigin(departureCity: string): OperatorGroup | null {
  const country = countryOfCity(departureCity);
  return country ? COUNTRY_TO_GROUP[country] ?? null : null;
}

function chatIdForGroup(group: OperatorGroup): string | undefined {
  const map: Record<OperatorGroup, string | undefined> = {
    moldova: process.env.TELEGRAM_CHAT_MOLDOVA,
    anglia: process.env.TELEGRAM_CHAT_ANGLIA,
    benelux: process.env.TELEGRAM_CHAT_BENELUX,
  };
  return map[group];
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function payLabel(m?: string | null): string {
  if (m === "card_on_pickup") return "Card la ridicare/livrare";
  if (m === "cash_on_pickup") return "Cash la ridicare/livrare";
  if (m === "cash_on_delivery") return "Cash la livrare";
  if (m === "paid_in_advance") return "Achitată în avans";
  return m || "—";
}

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) console.error("telegram sendMessage failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("telegram sendMessage error", e);
    return false;
  }
}

export type ParcelNotify = {
  bookingNumber: string;
  departureCity: string;
  arrivalCity: string;
  name: string;
  phone: string;
  email: string;
  parcelDetails?: string | null;
  payMethod?: string | null;
  ticketUrl?: string;
};

// Trimite cererea de colet la operatorul potrivit (după țara de ridicare).
export async function notifyParcelRequest(
  data: ParcelNotify
): Promise<{ sent: boolean; group: OperatorGroup | null; reason?: string }> {
  const group = operatorGroupForOrigin(data.departureCity);
  if (!group) return { sent: false, group: null, reason: "origine necunoscută" };
  const chatId = chatIdForGroup(group);
  if (!chatId) return { sent: false, group, reason: "chat id lipsă" };

  const lines = [
    `📦 <b>Cerere colet nouă</b> — ${esc(data.bookingNumber)}`,
    ``,
    `<b>Rută:</b> ${esc(data.departureCity)} → ${esc(data.arrivalCity)}`,
    `<b>Expeditor:</b> ${esc(data.name)}`,
    `<b>Telefon:</b> ${esc(data.phone)}`,
    data.email ? `<b>Email:</b> ${esc(data.email)}` : "",
    data.parcelDetails ? `<b>Colet:</b> ${esc(data.parcelDetails)}` : "",
    data.payMethod ? `<b>Plată:</b> ${esc(payLabel(data.payMethod))}` : "",
    data.ticketUrl ? `\n${esc(data.ticketUrl)}` : "",
  ].filter(Boolean);

  const sent = await sendTelegram(chatId, lines.join("\n"));
  return { sent, group };
}
