"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Bus, Users, Phone, AlertCircle, Check } from "lucide-react";
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

const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const dayHeadingFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long" });

function formatDuration(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function groupByDay(trips: PublicTrip[]): { label: string; iso: string; trips: PublicTrip[] }[] {
  const groups = new Map<string, { label: string; iso: string; trips: PublicTrip[] }>();
  for (const t of trips) {
    const k = dayKey(t.departureAt);
    if (!groups.has(k)) {
      const d = new Date(t.departureAt);
      const label = dayHeadingFmt.format(d);
      groups.set(k, { label, iso: t.departureAt, trips: [] });
    }
    groups.get(k)!.trips.push(t);
  }
  return Array.from(groups.values());
}

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

  useEffect(() => {
    if (!originCityId || !destCityId) {
      setTrips([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
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

  const grouped = useMemo(() => (trips ? groupByDay(trips) : []), [trips]);

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
          Caut curse disponibile…
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {!loading && !error && trips && trips.length === 0 && <NoTripsCard />}

      {!loading && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.iso}>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--ink-500)]">
                {g.label}
              </div>
              <div className="space-y-2">
                {g.trips.map((t) => {
                  const active = selectedTripId === t.id;
                  const sold = t.availableSeats === 0;
                  return (
                    <TripRow
                      key={t.id}
                      trip={t}
                      active={active}
                      disabled={sold && !active}
                      onClick={() => !sold && pickTrip(t)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
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

function TripRow({
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
  const dep = timeFmt.format(new Date(trip.departureAt));
  const arr = timeFmt.format(new Date(trip.arrivalAt));
  const duration = formatDuration(trip.departureAt, trip.arrivalAt);
  const arrivesNextDay =
    new Date(trip.arrivalAt).getDate() !== new Date(trip.departureAt).getDate();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-5 rounded-xl border bg-white p-4 transition-colors text-left",
        active
          ? "border-[color:var(--red-500)] shadow-[0_10px_30px_-18px_rgba(225,30,43,0.5)]"
          : "border-[color:var(--ink-200)] hover:border-[color:var(--navy-500)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--navy-50)] text-[color:var(--navy-900)]">
        <Clock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-[family-name:var(--font-montserrat)] text-lg font-extrabold text-[color:var(--navy-900)]">
          {dep} — {arr}
          {arrivesNextDay && (
            <span className="ml-1 text-xs font-semibold text-[color:var(--ink-500)]">(+1)</span>
          )}
        </div>
        <div className="text-xs text-[color:var(--ink-500)] flex items-center gap-2 mt-0.5">
          <Bus className="h-3 w-3" />
          <span>{trip.busLabel}</span>
          <span>·</span>
          <span>{duration}</span>
        </div>
      </div>
      <div className="hidden sm:flex flex-col items-end text-right mr-2">
        <div className="flex items-center gap-1 text-xs text-[color:var(--ink-500)]">
          <Users className="h-3 w-3" />
          {trip.availableSeats} libere
        </div>
        <div className="text-base font-bold text-[color:var(--navy-900)] mt-0.5">
          {trip.pricePerSeat} {trip.currency === "GBP" ? "£" : "€"}
        </div>
      </div>
      <div
        className={cn(
          "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
          active
            ? "border-[color:var(--red-500)] bg-[color:var(--red-500)]"
            : "border-[color:var(--ink-200)]"
        )}
      >
        {active && <Check className="h-3 w-3 text-white" />}
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
