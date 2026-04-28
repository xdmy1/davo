"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Printer,
  Download,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Check,
  Clock,
  AlertCircle,
  ArrowLeft,
  Share2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { contactInfo } from "@/lib/data";

interface Booking {
  id: string;
  bookingNumber: string;
  type: string;
  status: string;
  tripType: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  returnDate: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  price: number;
  currency: string;
  payMethod?: string | null;
  passengerResponse?: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; tone: "ok" | "warn" | "bad" }> = {
  confirmed: { label: "Confirmat", tone: "ok" },
  pending: { label: "În așteptare", tone: "warn" },
  cancelled: { label: "Anulat", tone: "bad" },
  in_transit: { label: "În tranzit", tone: "ok" },
  delivered: { label: "Livrat", tone: "ok" },
};

export default function TicketPage() {
  const params = useParams();
  const search = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printedRef = useRef(false);

  const bookingNumber = params.bookingNumber as string;
  const isPrintMode = search.get("print") === "1" || search.get("download") === "1";

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/bookings/${bookingNumber}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Not found"))))
      .then((data) => setBooking(data.booking))
      .catch((e) => {
        if (e.name !== "AbortError") setError("Rezervarea nu a fost găsită");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [bookingNumber]);

  // Auto-print când URL conține ?print=1 — dă utilizatorului dialogul "Save as PDF"
  useEffect(() => {
    if (!isPrintMode || !booking || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [isPrintMode, booking]);

  const handlePrint = () => window.print();

  const handleDownload = () => {
    // Deschide aceeași pagină în tab nou cu print=1 → user salvează ca PDF
    window.open(`/bilet/${bookingNumber}?print=1`, "_blank", "noopener");
  };

  const handleShare = async () => {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bilet DAVO — ${bookingNumber}`,
          text: `Biletul meu DAVO: ${booking?.departureCity} → ${booking?.arrivalCity}`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copiat în clipboard!");
      } catch {
        alert(url);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[color:var(--ink-50)]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-[color:var(--red-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[color:var(--ink-700)]">Se încarcă biletul...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[color:var(--ink-50)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 text-center max-w-md border border-[color:var(--ink-200)] shadow-[0_30px_60px_-30px_rgba(11,38,83,0.25)]"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-8 w-8 text-[color:var(--red-500)]" />
          </div>
          <h1 className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold text-[color:var(--navy-900)] mb-3">
            Bilet negăsit
          </h1>
          <p className="text-[color:var(--ink-700)] mb-6">
            Nu am găsit biletul cu numărul <span className="font-mono font-bold">{bookingNumber}</span>. Verifică numărul rezervării din emailul de confirmare.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}>
              <Button variant="primary">Sună-ne {contactInfo.phone}</Button>
            </a>
            <Link href="/">
              <Button variant="outline">Acasă</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const departureDate = new Date(booking.departureDate);
  const returnDate = booking.returnDate ? new Date(booking.returnDate) : null;
  const created = new Date(booking.createdAt);
  const isParcel = booking.type === "parcel" || booking.type === "colet_la_cheie";
  const status = STATUS_LABELS[booking.status] ?? { label: booking.status, tone: "warn" as const };
  const isCancelled = status.tone === "bad" || booking.passengerResponse === "cancelled";

  return (
    <div className="min-h-screen bg-[color:var(--ink-50)] py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <div className="no-print mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[color:var(--ink-700)] hover:text-[color:var(--navy-900)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Înapoi
          </Link>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-[0_40px_100px_-40px_rgba(11,38,83,0.35)] overflow-hidden print:shadow-none print:rounded-none border border-[color:var(--ink-200)] print:border-0"
        >
          {/* Header navy + bg-noise */}
          <header className="relative overflow-hidden bg-[color:var(--navy-900)] bg-hero-navy text-white p-7 print:p-6 print:bg-[#0b2653]">
            <div className="bg-noise absolute inset-0 opacity-30 print:hidden" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[color:var(--red-400)]">
                  DAVO Group · {isParcel ? "Confirmare colet" : "Bilet electronic"}
                </div>
                <div className="mt-2 font-[family-name:var(--font-montserrat)] text-2xl font-extrabold leading-tight">
                  {booking.departureCity} <span className="text-[color:var(--red-400)]">→</span>{" "}
                  {booking.arrivalCity}
                </div>
              </div>
              <div className="shrink-0 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2 text-center">
                <div className="text-[9px] uppercase tracking-widest font-bold text-white/55">DAVO</div>
                <div className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold leading-none">D</div>
              </div>
            </div>
          </header>

          {/* Status */}
          <div className="px-7 pt-6 pb-2 print:pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider " +
                  (status.tone === "ok"
                    ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                    : status.tone === "bad"
                      ? "bg-red-50 text-[color:var(--red-600)]"
                      : "bg-amber-50 text-amber-700")
                }
              >
                {isCancelled ? <XCircle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {status.label}
              </span>

              {booking.passengerResponse === "confirmed" && !isCancelled && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--success)]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pasager confirmat că vine
                </span>
              )}
            </div>
          </div>

          {/* Booking number */}
          <div className="px-7 py-5 text-center border-b border-[color:var(--ink-100)]">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[color:var(--ink-500)]">
              Număr rezervare
            </div>
            <div className="mt-1 font-mono font-extrabold text-[color:var(--navy-900)] text-2xl tracking-widest">
              {booking.bookingNumber}
            </div>
            <div className="mt-1 text-[11px] text-[color:var(--ink-500)]">
              Emis {created.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Route visual */}
          <div className="px-7 py-6 print:py-4">
            <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--ink-500)]">
                  Plecare
                </div>
                <div className="mt-1 font-[family-name:var(--font-montserrat)] text-xl font-extrabold text-[color:var(--navy-900)] truncate">
                  {booking.departureCity}
                </div>
              </div>
              <div className="flex flex-col items-center text-[color:var(--red-500)]">
                <div className="h-px w-12 bg-[color:var(--red-200,rgba(225,30,43,0.25))]" />
                <div className="my-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--red-50)] text-[color:var(--red-500)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="h-px w-12 bg-[color:var(--red-200,rgba(225,30,43,0.25))]" />
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--ink-500)]">
                  Sosire
                </div>
                <div className="mt-1 font-[family-name:var(--font-montserrat)] text-xl font-extrabold text-[color:var(--navy-900)] truncate">
                  {booking.arrivalCity}
                </div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-7 pb-6 grid grid-cols-2 gap-3 print:gap-2">
            <DetailCell icon={<Calendar className="h-3.5 w-3.5" />} label="Data plecării">
              {departureDate.toLocaleDateString("ro-RO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </DetailCell>
            {returnDate && (
              <DetailCell icon={<Calendar className="h-3.5 w-3.5" />} label="Data întoarcerii">
                {returnDate.toLocaleDateString("ro-RO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </DetailCell>
            )}
            <DetailCell icon={<User className="h-3.5 w-3.5" />} label={isParcel ? "Tip" : "Pasageri"}>
              {isParcel
                ? booking.type === "colet_la_cheie"
                  ? "Colet la cheie"
                  : "Colet"
                : `${booking.adults} ${booking.adults === 1 ? "adult" : "adulți"}${booking.children > 0 ? `, ${booking.children} ${booking.children === 1 ? "copil" : "copii"}` : ""}`}
            </DetailCell>
            <DetailCell icon={<Clock className="h-3.5 w-3.5" />} label="Direcție">
              {booking.tripType === "round-trip" ? "Tur-retur" : "O direcție"}
            </DetailCell>
          </div>

          {/* Passenger info */}
          <div className="px-7 pb-6 border-t border-[color:var(--ink-100)] pt-5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--ink-500)] mb-3">
              {isParcel ? "Date expeditor" : "Date pasager"}
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-[color:var(--navy-900)]">
                <User className="h-3.5 w-3.5 text-[color:var(--red-500)]" />
                <span className="font-semibold">
                  {booking.firstName} {booking.lastName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[color:var(--ink-700)]">
                <Phone className="h-3.5 w-3.5 text-[color:var(--red-500)]" />
                {booking.phone}
              </div>
              <div className="flex items-center gap-2 text-[color:var(--ink-700)]">
                <Mail className="h-3.5 w-3.5 text-[color:var(--red-500)]" />
                {booking.email}
              </div>
            </div>
          </div>

          {/* Price + QR — navy band */}
          <div className="bg-[color:var(--navy-900)] bg-hero-navy text-white p-7 relative overflow-hidden print:bg-[#0b2653]">
            <div className="bg-noise absolute inset-0 opacity-30 print:hidden" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[color:var(--red-400)]">
                  Preț total
                </div>
                <div className="mt-1 font-[family-name:var(--font-montserrat)] text-3xl font-extrabold">
                  {booking.price} {booking.currency}
                </div>
                {booking.payMethod && (
                  <div className="mt-2 text-xs text-white/70">
                    {booking.payMethod === "cash_on_pickup"
                      ? "Plată cash la îmbarcare/livrare"
                      : booking.payMethod === "card_on_pickup"
                        ? "Plată cu cardul la îmbarcare/livrare"
                        : booking.payMethod === "cash_on_delivery"
                          ? "Plată cash la livrare"
                          : booking.payMethod}
                  </div>
                )}
              </div>
              <div className="shrink-0 h-24 w-24 rounded-xl bg-white p-2 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/tickets/${booking.bookingNumber}/qr.png`}
                  alt="Cod QR pentru verificare"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="p-7 bg-[color:var(--ink-50)] text-sm text-[color:var(--ink-700)] print:bg-[#f5f7fb]">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[color:var(--red-500)] mt-0.5 shrink-0" />
              <span>{contactInfo.address}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[color:var(--red-500)]" />
              <span>{contactInfo.phone}</span>
              <span className="text-[color:var(--ink-300,rgba(11,38,83,0.18))]">·</span>
              <Mail className="h-4 w-4 text-[color:var(--red-500)]" />
              <span>{contactInfo.email}</span>
            </div>
          </footer>
        </motion.article>

        {/* Actions */}
        <div className="no-print mt-6 flex flex-wrap gap-3 justify-center">
          <Button onClick={handlePrint} variant="primary">
            <Printer className="h-4 w-4" />
            Tipărește
          </Button>
          <Button onClick={handleDownload} variant="secondary">
            <Download className="h-4 w-4" />
            Descarcă PDF
          </Button>
          <Button onClick={handleShare} variant="outline">
            <Share2 className="h-4 w-4" />
            Distribuie
          </Button>
        </div>

        {/* Reminders */}
        <div className="no-print mt-6 rounded-2xl border border-[color:var(--navy-200,rgba(20,58,122,0.18))] bg-[color:var(--navy-50)] p-5 text-sm text-[color:var(--navy-900)]">
          <div className="font-[family-name:var(--font-montserrat)] font-bold mb-2">
            Informații importante
          </div>
          <ul className="space-y-1 text-[color:var(--ink-700)]">
            <li>• Ajunge la îmbarcare cu 30 de minute înainte.</li>
            <li>• Ai nevoie de act de identitate / pașaport valabil.</li>
            <li>• Pentru modificări sau anulări: {contactInfo.phone}.</li>
            <li>• Bagaj gratuit inclus: 35 kg.</li>
            <li>• La bord: Internet Starlink, prânz, ceai/cafea naturală, însoțitoare 24/24.</li>
          </ul>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          @page {
            size: A4;
            margin: 1.2cm;
          }
        }
      `}</style>
    </div>
  );
}

function DetailCell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[color:var(--ink-50)] border border-[color:var(--ink-100)] p-3 print:bg-white print:border-[color:var(--ink-200)]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[color:var(--ink-500)]">
        <span className="text-[color:var(--red-500)]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[color:var(--navy-900)]">{children}</div>
    </div>
  );
}
