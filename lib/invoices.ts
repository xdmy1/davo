// Proforme și facturi (davo.md/admin/facturi): calcule, formatare, numerotare
// și validarea datelor din formular. Fără Prisma aici, ca să fie testabil
// (vezi lib/invoices.test.ts).

export const INVOICE_TYPES = ["proforma", "invoice"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export const INVOICE_STATUSES = ["draft", "issued", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_CURRENCIES = ["GBP", "EUR", "MDL", "RON", "USD"] as const;
export type InvoiceCurrency = (typeof INVOICE_CURRENCIES)[number];

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  proforma: "Proformă",
  invoice: "Factură",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Ciornă",
  issued: "Emisă",
  paid: "Achitată",
  cancelled: "Anulată",
};

export type InvoiceItem = {
  description: string;
  /** Procent, ex. 0 sau 20. */
  taxRate: number;
  quantity: number;
  rate: number;
};

// ===== Bani =====

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const SYMBOL: Partial<Record<string, string>> = { GBP: "£", EUR: "€", USD: "$" };

function groupThousands(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * „£5,040.00" / „€0.00" / „$12.50". MDL și RON n-au simbol uzual în engleză:
 * codul în față, „MDL 1,000.00".
 */
export function formatMoney(amount: number, currency: string, decimals: 0 | 2 = 2): string {
  const neg = amount < 0;
  const body = groupThousands(Math.abs(round2(amount)), decimals);
  const sym = SYMBOL[currency];
  const s = sym ? `${sym}${body}` : `${currency} ${body}`;
  return neg ? `-${s}` : s;
}

/** Coloana „Rate": fără zecimale când suma e întreagă („£5,040"). */
export function formatRate(amount: number, currency: string): string {
  return formatMoney(amount, currency, Number.isInteger(round2(amount)) ? 0 : 2);
}

/** „1", „2.5" — cantități și procente fără zerouri inutile. */
export function formatPlain(n: number): string {
  return String(round2(n));
}

// ===== Totaluri =====

export type LineTotals = { amount: number; tax: number; total: number };
export type InvoiceTotals = {
  lines: LineTotals[];
  amount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
};

export function lineTotals(item: InvoiceItem): LineTotals {
  const amount = round2(item.quantity * item.rate);
  const tax = round2((amount * item.taxRate) / 100);
  return { amount, tax, total: round2(amount + tax) };
}

/**
 * `amountPaid` null + status „paid" = achitat integral (cazul obișnuit:
 * „Marchează achitat" fără sumă).
 */
export function invoiceTotals(
  items: InvoiceItem[],
  amountPaid: number | null,
  status: InvoiceStatus,
): InvoiceTotals {
  const lines = items.map(lineTotals);
  const amount = round2(lines.reduce((s, l) => s + l.amount, 0));
  const tax = round2(lines.reduce((s, l) => s + l.tax, 0));
  const total = round2(amount + tax);
  const paid = round2(amountPaid ?? (status === "paid" ? total : 0));
  return { lines, amount, tax, total, paid, balance: round2(total - paid) };
}

// ===== Suma în cuvinte (engleză, stilul Refrens: fără „AND" în interiorul numărului) =====

const ONES = [
  "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
  "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN",
];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
const SCALES = ["", "THOUSAND", "MILLION", "BILLION", "TRILLION"];

function below1000(n: number): string[] {
  const out: string[] = [];
  if (n >= 100) {
    out.push(ONES[Math.floor(n / 100)], "HUNDRED");
    n %= 100;
  }
  if (n >= 20) {
    out.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    out.push(ONES[n]);
  }
  return out;
}

export function integerToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "ZERO";
  const words: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) words.unshift(...below1000(chunk), ...(SCALES[scale] ? [SCALES[scale]] : []));
    n = Math.floor(n / 1000);
    scale++;
  }
  return words.join(" ");
}

const CURRENCY_WORDS: Record<string, { one: string; many: string; subOne: string; subMany: string }> = {
  GBP: { one: "POUND", many: "POUNDS", subOne: "PENNY", subMany: "PENCE" },
  EUR: { one: "EURO", many: "EUROS", subOne: "CENT", subMany: "CENTS" },
  USD: { one: "DOLLAR", many: "DOLLARS", subOne: "CENT", subMany: "CENTS" },
  MDL: { one: "LEU", many: "LEI", subOne: "BAN", subMany: "BANI" },
  RON: { one: "LEU", many: "LEI", subOne: "BAN", subMany: "BANI" },
};

/** „SIX THOUSAND ONE HUNDRED THIRTY EUROS ONLY", „… EUROS AND FIFTY CENTS ONLY". */
export function amountInWords(amount: number, currency: string): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const sub = cents % 100;
  const w = CURRENCY_WORDS[currency] ?? { one: currency, many: currency, subOne: "CENT", subMany: "CENTS" };
  let s = `${integerToWords(whole)} ${whole === 1 ? w.one : w.many}`;
  if (sub) s += ` AND ${integerToWords(sub)} ${sub === 1 ? w.subOne : w.subMany}`;
  return `${s} ONLY`;
}

// ===== Date =====

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** „Oct 15, 2026". Datele sunt stocate ca zile calendaristice (UTC miezul nopții). */
export function formatInvoiceDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** „2026-10-15" → Date UTC la miezul nopții; null dacă formatul e greșit. */
export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

export function dayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Ziua de azi la Chișinău, ca „YYYY-MM-DD". */
export function todayChisinau(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Chisinau" }).format(now);
}

// ===== Numerotare =====

export const NUMBER_PREFIX = "DAV";
/** Primul număr propus când seria e goală (referințele: DAV25492, DAV26002). */
export const SERIES_START: Record<InvoiceType, number> = { proforma: 25493, invoice: 26003 };

/**
 * Numărul propus pentru serie: cel mai mare `DAV<n>` din serie + 1 (sau
 * începutul seriei). Sare peste numerele deja folosite oriunde (`taken`),
 * fiindcă unicitatea e globală, iar cele două serii folosesc același prefix.
 */
export function nextInvoiceNumber(
  type: InvoiceType,
  seriesNumbers: string[],
  taken: Iterable<string> = seriesNumbers,
): string {
  const re = new RegExp(`^${NUMBER_PREFIX}(\\d+)$`);
  let max = SERIES_START[type] - 1;
  for (const num of seriesNumbers) {
    const m = re.exec(num.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  const used = new Set(Array.from(taken, (t) => t.trim().toUpperCase()));
  let n = max + 1;
  while (used.has(`${NUMBER_PREFIX}${n}`)) n++;
  return `${NUMBER_PREFIX}${n}`;
}

// ===== Nume de fișier (stilul Refrens) =====

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** „invoice-dav26002-davo-group-srl-sc-mirbus-srl". */
export function invoiceFileName(type: InvoiceType, number: string, clientName: string): string {
  return [type, number, "DAVO GROUP SRL", clientName].map(slugify).filter(Boolean).join("-");
}

// ===== Validare input (server) =====

export type InvoiceInput = {
  type: InvoiceType;
  number: string;
  issueDate: Date;
  dueDate: Date | null;
  poNumber: string | null;
  currency: InvoiceCurrency;
  bankAccountId: string;
  clientName: string;
  clientAddress: string;
  clientCity: string | null;
  clientCountry: string | null;
  clientPostcode: string | null;
  clientVat: string | null;
  clientEmail: string | null;
  items: InvoiceItem[];
  showTotalInWords: boolean;
  notes: string | null;
  status: InvoiceStatus;
  amountPaid: number | null;
  paidAt: Date | null;
};

export type ParseResult = { ok: true; data: InvoiceInput } | { ok: false; error: string };

const str = (v: unknown, max = 2000): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\r\n/g, "\n").trim();
  return t ? t.slice(0, max) : null;
};

const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export function parseInvoiceInput(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Date lipsă" };
  const b = body as Record<string, unknown>;
  const fail = (error: string): ParseResult => ({ ok: false, error });

  if (!INVOICE_TYPES.includes(b.type as InvoiceType)) return fail("Tip invalid");
  if (!INVOICE_STATUSES.includes(b.status as InvoiceStatus)) return fail("Status invalid");
  if (!INVOICE_CURRENCIES.includes(b.currency as InvoiceCurrency)) return fail("Valută invalidă");

  const number = str(b.number, 40)?.toUpperCase().replace(/\s+/g, "");
  if (!number) return fail("Numărul e obligatoriu");

  const issueDate = parseDay(b.issueDate);
  if (!issueDate) return fail("Data facturii e invalidă");
  const dueDate = b.dueDate ? parseDay(b.dueDate) : null;
  if (b.dueDate && !dueDate) return fail("Scadența e invalidă");

  const bankAccountId = str(b.bankAccountId, 64);
  if (!bankAccountId) return fail("Alege contul bancar");

  const clientName = str(b.clientName, 200);
  if (!clientName) return fail("Numele clientului e obligatoriu");

  if (!Array.isArray(b.items) || b.items.length === 0) return fail("Adaugă cel puțin o poziție");
  if (b.items.length > 100) return fail("Prea multe poziții");
  const items: InvoiceItem[] = [];
  for (const [i, raw] of b.items.entries()) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const description = str(r.description, 2000);
    const taxRate = num(r.taxRate) ?? 0;
    const quantity = num(r.quantity);
    const rate = num(r.rate);
    if (!description) return fail(`Poziția ${i + 1}: descrierea lipsește`);
    if (quantity === null || quantity <= 0) return fail(`Poziția ${i + 1}: cantitate invalidă`);
    if (rate === null || rate < 0) return fail(`Poziția ${i + 1}: preț invalid`);
    if (taxRate < 0 || taxRate > 100) return fail(`Poziția ${i + 1}: TVA invalid`);
    items.push({ description, taxRate, quantity, rate });
  }

  const status = b.status as InvoiceStatus;
  const amountPaidRaw = b.amountPaid === "" || b.amountPaid == null ? null : num(b.amountPaid);
  if (b.amountPaid !== "" && b.amountPaid != null && (amountPaidRaw === null || amountPaidRaw < 0)) {
    return fail("Suma achitată e invalidă");
  }
  const paidAt = b.paidAt ? parseDay(b.paidAt) : null;
  if (b.paidAt && !paidAt) return fail("Data achitării e invalidă");

  return {
    ok: true,
    data: {
      type: b.type as InvoiceType,
      number,
      issueDate,
      dueDate,
      poNumber: str(b.poNumber, 80),
      currency: b.currency as InvoiceCurrency,
      bankAccountId,
      clientName,
      clientAddress: str(b.clientAddress, 1000) ?? "",
      clientCity: str(b.clientCity, 120),
      clientCountry: str(b.clientCountry, 120),
      clientPostcode: str(b.clientPostcode, 40),
      clientVat: str(b.clientVat, 80),
      clientEmail: str(b.clientEmail, 200),
      items,
      showTotalInWords: b.showTotalInWords === true,
      notes: str(b.notes, 5000),
      status,
      amountPaid: amountPaidRaw === null ? null : round2(amountPaidRaw),
      paidAt,
    },
  };
}
