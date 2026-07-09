import type { Locale } from "@/lib/i18n/config";

const monthNames: Record<Locale, string[]> = {
  ro: [
    "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
  ],
  ru: [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ],
};

// Format an ISO date (YYYY-MM-DD) as a human date without pulling in a locale
// runtime. Falls back to the raw string if the input is malformed.
export function formatBlogDate(iso: string, locale: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const year = m[1];
  const month = monthNames[locale][Number(m[2]) - 1] ?? "";
  const day = String(Number(m[3]));
  return `${day} ${month} ${year}`;
}
