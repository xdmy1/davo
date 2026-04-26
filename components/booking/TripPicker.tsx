"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus,
  Users,
  Phone,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeatLayout } from "@/lib/adminMock";
import { SeatPicker } from "./SeatPicker";

export type PublicTrip = {
  id: string;
  departureAt: string;
  arrivalAt: string;
  status: string;
  busId: string;
  busLabel: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  currency: string;
};

type TripDetail = {
  id: string;
  departureAt: string;
  arrivalAt: string;
  bus: { id: string; label: string; totalSeats: number; layout: SeatLayout };
  occupiedSeats: number[];
};

const weekdayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "long" });
const dateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const arrivalDayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short" });

function formatDuration(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  return `~${h}h`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const VISIBLE_DESKTOP = 4;

export function TripPicker({
  title,
  subtitle,
  originCityId,
  destCityId,
  fromDate,
  maxSeats,
  selectedTripId,
  selectedSeats,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  originCityId: string | null;
  destCityId: string | null;
  /** ISO date string — earliest acceptable departure (e.g. outbound's departureAt for return picker). */
  fromDate?: string | null;
  maxSeats: number;
  selectedTripId: string | null;
  selectedSeats: number[];
  onSelect: (tripId: string | null, seats: number[], trip?: PublicTrip | null) => void;
}) {
  const [trips, setTrips] = useState<PublicTrip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pageStart, setPageStart] = useState(0);

  useEffect(() => {
    if (!originCityId || !destCityId) {
      setTrips([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPageStart(0);
    const params = new URLSearchParams({ originCityId, destCityId });
    if (fromDate) params.set("from", fromDate);
    fetch(`/api/public/trips?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setTrips(d.trips ?? []);
        else setError(d?.error ?? "Eroare la încărcarea curselor");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Eroare de rețea");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [originCityId, destCityId, fromDate]);

  useEffect(() => {
    if (!selectedTripId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetailLoading(true);
    fetch(`/api/public/trips/${selectedTripId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setDetail(d.trip);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError("Nu s-a putut încărca layoutul autocarului");
      })
      .finally(() => setDetailLoading(false));
    return () => controller.abort();
  }, [selectedTripId]);

  const total = trips?.length ?? 0;
  const canPrev = pageStart > 0;
  const canNext = pageStart + VISIBLE_DESKTOP < total;
  const visible = useMemo(
    () => (trips ?? []).slice(pageStart, pageStart + VISIBLE_DESKTOP),
    [trips, pageStart]
  );

  const pickTrip = (trip: PublicTrip) => {
    if (selectedTripId === trip.id) {
      onSelect(null, [], null);
    } else {
      onSelect(trip.id, [], trip);
    }
  };

  const updateSeats = (seats: number[]) => {
    if (selectedTripId) onSelect(selectedTripId, seats);
  };

  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
          {title}
        </span>
        {subtitle && (
          <h2 className="display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">{subtitle}</h2>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-sm text-[color:var(--ink-500)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--red-500)] border-t-transparent mr-2" />
          Caut datele disponibile…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && trips && trips.length === 0 && <NoTripsCard />}

      {!loading && total > 0 && (
        <div>
          {/* Hint + paginare */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-[color:var(--ink-500)]">
              {total} {total === 1 ? "dată disponibilă" : "date disponibile"} · alege ziua plecării
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPageStart((s) => Math.max(0, s - VISIBLE_DESKTOP))}
                disabled={!canPrev}
                aria-label="Date anterioare"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ink-200)] bg-white text-[color:var(--navy-900)] hover:border-[color:var(--navy-500)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPageStart((s) => Math.min(total - VISIBLE_DESKTOP, s + VISIBLE_DESKTOP))}
                disabled={!canNext}
                aria-label="Date următoare"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--ink-200)] bg-white text-[color:var(--navy-900)] hover:border-[color:var(--navy-500)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Desktop: 4 carduri / Mobile: stivă verticală */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {visible.map((t) => (
              <DateCard
                key={t.id}
                trip={t}
                active={selectedTripId === t.id}
                disabled={t.availableSeats === 0 && selectedTripId !== t.id}
                onClick={() => t.availableSeats > 0 && pickTrip(t)}
              />
            ))}
          </div>

          {/* Indicator paginare mobile */}
          {total > VISIBLE_DESKTOP && (
            <div className="mt-4 flex justify-center md:hidden">
              <button
                type="button"
                onClick={() => setPageStart((s) => Math.min(total - VISIBLE_DESKTOP, s + VISIBLE_DESKTOP))}
                disabled={!canNext}
                className="text-xs font-semibold text-[color:var(--navy-700)] underline decoration-[color:var(--red-500)] underline-offset-4 disabled:opacity-30"
              >
                Vezi mai multe date →
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedTripId && (
          <motion.div
            key="seat-picker"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 overflow-hidden"
          >
            {detailLoading && (
              <div className="flex items-center justify-center py-10 text-sm text-[color:var(--ink-500)]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--red-500)] border-t-transparent mr-2" />
                Încărc layoutul autocarului…
              </div>
            )}
            {!detailLoading && detail && (
              <SeatPicker
                layout={detail.bus.layout}
                occupiedSeats={detail.occupiedSeats}
                selected={selectedSeats}
                onSelect={updateSeats}
                max={maxSeats}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DateCard({
  trip,
  active,
  disabled,
  onClick,
}: {
  trip: PublicTrip;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const dep = new Date(trip.departureAt);
  const arr = new Date(trip.arrivalAt);
  const weekday = capitalize(weekdayFmt.format(dep));
  const dateStr = dateFmt.format(dep);
  const depTime = timeFmt.format(dep);
  const arrTime = timeFmt.format(arr);
  const arrivesNextDay = arr.toDateString() !== dep.toDateString();
  const duration = formatDuration(trip.departureAt, trip.arrivalAt);
  const currency = trip.currency === "GBP" ? "£" : "€";
  const sold = trip.availableSeats === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-[color:var(--red-500)] bg-white shadow-[0_18px_40px_-20px_rgba(225,30,43,0.55)] ring-1 ring-[color:var(--red-500)]"
          : "border-[color:var(--ink-200)] bg-white hover:border-[color:var(--navy-500)] hover:shadow-[0_10px_30px_-22px_rgba(20,58,122,0.45)]",
        disabled && "opacity-50 cursor-not-allowed hover:border-[color:var(--ink-200)] hover:shadow-none"
      )}
    >
      {/* Selection bullet */}
      <div
        className={cn(
          "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
          active
            ? "border-[color:var(--red-500)] bg-[color:var(--red-500)]"
            : "border-[color:var(--ink-200)]"
        )}
      >
        {active && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Header: weekday mare, dată mică */}
      <div className="pr-7">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--red-500)]">
          {weekday}
        </div>
        <div className="font-[family-name:var(--font-montserrat)] mt-0.5 text-2xl font-extrabold text-[color:var(--navy-900)] leading-none">
          {dateStr}
        </div>
      </div>

      {/* Ore */}
      <div className="rounded-xl bg-[color:var(--ink-50)] px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[color:var(--ink-500)]">
          <Clock className="h-3 w-3 text-[color:var(--red-500)]" />
          Plecare
          <span className="ml-auto font-[family-name:var(--font-montserrat)] text-base font-extrabold tracking-tight text-[color:var(--navy-900)]">
            {depTime}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[color:var(--ink-500)]">
          <span>Sosire {arrivesNextDay ? arrivalDayFmt.format(arr) : ""}</span>
          <span className="font-semibold text-[color:var(--navy-700)]">{arrTime}</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-widest font-bold text-[color:var(--ink-400)]">
          Durată {duration}
        </div>
      </div>

      {/* Footer: locuri + preț */}
      <div className="flex items-end justify-between">
        <div className="text-xs flex items-center gap-1.5">
          <Bus className="h-3.5 w-3.5 text-[color:var(--ink-400)]" />
          <span className="text-[color:var(--ink-700)]">{trip.busLabel}</span>
        </div>
        <div className="text-right">
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-semibold",
            sold ? "text-red-600" : "text-[color:var(--ink-500)]"
          )}>
            <Users className="h-3 w-3" />
            {sold ? "Locuri epuizate" : `${trip.availableSeats} libere`}
          </div>
          <div className="font-[family-name:var(--font-montserrat)] mt-0.5 text-lg font-extrabold text-[color:var(--navy-900)]">
            {trip.pricePerSeat}
            {currency}
          </div>
        </div>
      </div>
    </button>
  );
}

function NoTripsCard() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-amber-900">Nu sunt curse programate pe această rută</div>
          <div className="mt-1 text-sm text-amber-800">
            Sună-ne — confirmăm disponibilitatea și aranjăm transport personalizat.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="tel:+37368065699"
              className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--red-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--red-600)]"
            >
              <Phone className="h-3.5 w-3.5" /> +373 68 065 699
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
