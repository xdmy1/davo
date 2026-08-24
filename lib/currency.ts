// Afișarea prețurilor pentru vizitatorii din Moldova: totul în lei (MDL),
// cu prețul original EUR/GBP alături. Cursul e cel FIX agreat cu operatorul
// (aprox. BNM, rotunjit comercial) — NU se ia live de la BNM. Dacă se
// schimbă înțelegerea, modifică doar constantele de mai jos.
export const MDL_PER_EUR = 20;
export const MDL_PER_GBP = 23;

export type IsoCurrency = "EUR" | "GBP" | string;

// Acceptă și simbolul ("€"/"£"), și codul ISO ("EUR"/"GBP") — ambele forme
// circulă prin cod (lib/data.ts ține simboluri, DB ține ISO).
export function toIso(currency: string): IsoCurrency {
  if (currency === "£" || currency === "GBP") return "GBP";
  if (currency === "€" || currency === "EUR") return "EUR";
  return currency;
}

export function currencySymbol(currency: string): string {
  const iso = toIso(currency);
  return iso === "GBP" ? "£" : iso === "EUR" ? "€" : iso;
}

// null = valută pe care nu știm s-o convertim (ex. MDL deja, USD) — nu afișăm lei.
export function toMdl(amount: number, currency: string): number | null {
  const iso = toIso(currency);
  const rate = iso === "EUR" ? MDL_PER_EUR : iso === "GBP" ? MDL_PER_GBP : null;
  if (rate == null || !Number.isFinite(amount)) return null;
  return Math.round(amount * rate);
}

// "2.400 MDL" — același formatter ca în shop-ul colet-la-cheie.
export function formatMdl(amount: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0,
  }).format(amount);
}
