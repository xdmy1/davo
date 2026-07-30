// Notificare Telegram pentru cererile de colet. Ruta se decide după țara de
// RIDICARE (origine): Moldova → operator MD, Anglia → operator UK, iar
// Belgia/Olanda/Germania/Luxemburg → operator BE.
//
// Un bot de Telegram NU poate scrie unui număr de telefon — trimite către un
// `chat_id`. Fiecare operator (sau grup) pornește o conversație cu botul, iar
// chat_id-ul lui se pune în env. Numerele de pe site sunt doar eticheta rutării.
//
// Config (token + chat_id-uri) se citește din tabela Settings (cheile
// `telegram_bot_token`, `telegram_chat_moldova|anglia|benelux|default`), cu
// fallback pe env (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_*). Dacă lipsesc, trimiterea
// e no-op (nu blochează rezervarea). `telegram_chat_default` primește cererile
// pentru un grup fără chat setat încă, ca să nu se piardă nimic.

import { destinations, moldovanCities } from "@/lib/data";
import { prisma } from "@/lib/prisma";

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

type TgConfig = {
  token?: string;
  chats: Partial<Record<OperatorGroup | "default", string>>;
};

let cfgCache: { v: TgConfig; at: number } | null = null;
const CFG_TTL_MS = 60 * 1000;

async function getConfig(): Promise<TgConfig> {
  if (cfgCache && Date.now() - cfgCache.at < CFG_TTL_MS) return cfgCache.v;
  const keys = [
    "telegram_bot_token",
    "telegram_chat_moldova",
    "telegram_chat_anglia",
    "telegram_chat_benelux",
    "telegram_chat_default",
  ];
  const m = new Map<string, string>();
  try {
    const rows = await prisma.settings.findMany({ where: { key: { in: keys } } });
    for (const r of rows) m.set(r.key, r.value);
  } catch {
    /* DB indisponibil → cădem pe env */
  }
  const v: TgConfig = {
    token: m.get("telegram_bot_token") || process.env.TELEGRAM_BOT_TOKEN,
    chats: {
      moldova: m.get("telegram_chat_moldova") || process.env.TELEGRAM_CHAT_MOLDOVA,
      anglia: m.get("telegram_chat_anglia") || process.env.TELEGRAM_CHAT_ANGLIA,
      benelux: m.get("telegram_chat_benelux") || process.env.TELEGRAM_CHAT_BENELUX,
      default: m.get("telegram_chat_default") || process.env.TELEGRAM_CHAT_DEFAULT,
    },
  };
  cfgCache = { v, at: Date.now() };
  return v;
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

export async function sendTelegram(chatId: string, text: string, token?: string): Promise<boolean> {
  const tok = token || (await getConfig()).token;
  if (!tok || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
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

  const cfg = await getConfig();
  if (!cfg.token) return { sent: false, group, reason: "token lipsă" };
  // Chat-ul grupului; dacă lipsește, cade pe „default" cu o notă vizibilă.
  const groupChat = cfg.chats[group];
  const chatId = groupChat || cfg.chats.default;
  if (!chatId) return { sent: false, group, reason: "chat id lipsă" };
  const fallbackNote = !groupChat ? `⚠️ <i>(fără chat pentru operatorul ${group.toUpperCase()} — trimis pe canalul implicit)</i>\n\n` : "";

  const lines = [
    `${fallbackNote}📦 <b>Cerere colet nouă</b> — ${esc(data.bookingNumber)}`,
    ``,
    `<b>Operator:</b> ${group.toUpperCase()}`,
    `<b>Rută:</b> ${esc(data.departureCity)} → ${esc(data.arrivalCity)}`,
    `<b>Expeditor:</b> ${esc(data.name)}`,
    `<b>Telefon:</b> ${esc(data.phone)}`,
    data.email ? `<b>Email:</b> ${esc(data.email)}` : "",
    data.parcelDetails ? `<b>Colet:</b> ${esc(data.parcelDetails)}` : "",
    data.payMethod ? `<b>Plată:</b> ${esc(payLabel(data.payMethod))}` : "",
    data.ticketUrl ? `\n${esc(data.ticketUrl)}` : "",
  ].filter(Boolean);

  const sent = await sendTelegram(chatId, lines.join("\n"), cfg.token);
  return { sent, group };
}
