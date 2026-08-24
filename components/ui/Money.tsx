"use client";

import { useEffect, useState } from "react";
import { currencySymbol, formatMdl, toMdl } from "@/lib/currency";

// Un singur fetch /api/geo per pagină, împărțit între toate instanțele <Money>.
// SSR + vizitatorii din afara Moldovei văd prețul original (EUR/GBP); după
// hidratare, vizitatorii din MD văd leii cu originalul în paranteză.
let inMoldovaPromise: Promise<boolean> | null = null;

function fetchInMoldova(): Promise<boolean> {
  if (!inMoldovaPromise) {
    inMoldovaPromise = fetch("/api/geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.countryCode === "MD")
      .catch(() => false);
  }
  return inMoldovaPromise;
}

export function useInMoldova(): boolean {
  const [inMoldova, setInMoldova] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchInMoldova().then((v) => {
      if (alive && v) setInMoldova(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return inMoldova;
}

interface MoneyProps {
  amount: number;
  /** "EUR" | "GBP" sau simbolul "€" | "£" — ambele forme circulă prin cod. */
  currency: string;
  className?: string;
}

/**
 * Afișează un preț: "120 £" pentru toată lumea, iar pentru vizitatorii din
 * Moldova "2.760 MDL (120 £)". Cursul fix e în lib/currency.ts.
 */
export default function Money({ amount, currency, className }: MoneyProps) {
  const inMoldova = useInMoldova();
  const symbol = currencySymbol(currency);
  const original = `${amount} ${symbol}`;

  if (inMoldova) {
    const mdl = toMdl(amount, currency);
    if (mdl != null) {
      return (
        <span className={className}>
          {formatMdl(mdl)}{" "}
          <span className="whitespace-nowrap opacity-70">({original})</span>
        </span>
      );
    }
  }
  return <span className={className}>{original}</span>;
}
