"use client";

import { useEffect, useMemo, useState } from "react";
import { Armchair, RefreshCw, Bus as BusIcon } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import { SeatPicker } from "@/components/booking/SeatPicker";
import type { SeatLayout } from "@/lib/adminMock";

// Pagină de vizualizare schemă autocar: admin / admin2 selectează ruta și
// cursa, vede layout-ul autocarului cu locurile ocupate. Click pe un loc
// ocupat → detaliile pasagerului. Nu permite rezervare (read-only).

type Route = {
  id: string;
  origin: string;
  destination: string;
  country: string;
  basePrice: number;
  currency: string;
  originCityId: string;
  destinationCityId: string;
  active: boolean;
};

type TripRow = {
  id: string;
  departureAt: string;
  availableSeats: number;
  totalSeats: number;
  busLabel: string;
};

type SeatInfo = {
  bookingId: string;
  bookingNumber: string;
  passengerName: string;
  phone: string;
  email: string;
  status: string;
};

const fullDateFmt = new Intl.DateTimeFormat("ro-RO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Chisinau",
});

export default function SeatsPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routeId, setRouteId] = useState<string>("");

  const [trips, setTrips] = useState<TripRow[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripId, setTripId] = useState<string>("");

  const [tripDetail, setTripDetail] = useState<{
    layout: SeatLayout;
    occupiedSeats: number[];
  } | null>(null);
  const [seatInfoMap, setSeatInfoMap] = useState<Record<number, SeatInfo>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [inspectedSeat, setInspectedSeat] = useState<number | null>(null);

  // Listă rute o singură dată; o sortez ca să fie ușor de scanat.
  useEffect(() => {
    setRoutesLoading(true);
    fetch("/api/admin/routes")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          const sorted = [...(d.routes as Route[])]
            .filter((r) => r.active)
            .sort((a, b) =>
              `${a.origin} ${a.destination}`.localeCompare(`${b.origin} ${b.destination}`, "ro"),
            );
          setRoutes(sorted);
        }
      })
      .finally(() => setRoutesLoading(false));
  }, []);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === routeId) ?? null,
    [routes, routeId],
  );

  // Cursele pe ruta aleasă — public/trips răspunde cu calendar de curse.
  useEffect(() => {
    setTrips([]);
    setTripId("");
    setTripDetail(null);
    setSeatInfoMap({});
    setInspectedSeat(null);
    if (!selectedRoute) return;
    const ac = new AbortController();
    setTripsLoading(true);
    const params = new URLSearchParams({
      originCityId: selectedRoute.originCityId,
      destCityId: selectedRoute.destinationCityId,
      limit: "20",
    });
    fetch(`/api/public/trips?${params.toString()}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setTrips((d.trips ?? []) as TripRow[]);
      })
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
    return () => ac.abort();
  }, [selectedRoute]);

  // Detaliul cursei selectate: layout + locuri ocupate + identitate per loc.
  useEffect(() => {
    setTripDetail(null);
    setSeatInfoMap({});
    setInspectedSeat(null);
    if (!tripId) return;
    const ac = new AbortController();
    setDetailLoading(true);
    Promise.all([
      fetch(`/api/public/trips/${tripId}`, { signal: ac.signal })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/admin/trips/${tripId}/seats`, { signal: ac.signal })
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([trip, seats]) => {
        if (trip?.success && trip.trip?.bus) {
          setTripDetail({
            layout: trip.trip.bus.layout,
            occupiedSeats: trip.trip.occupiedSeats ?? [],
          });
        }
        if (seats?.success && Array.isArray(seats.seats)) {
          const map: Record<number, SeatInfo> = {};
          for (const s of seats.seats) {
            if (s.booking) {
              map[s.seatNumber] = {
                bookingId: s.booking.id,
                bookingNumber: s.booking.bookingNumber,
                passengerName: s.booking.passengerName,
                phone: s.booking.phone,
                email: s.booking.email,
                status: s.booking.status,
              };
            }
          }
          setSeatInfoMap(map);
        }
      })
      .finally(() => setDetailLoading(false));
    return () => ac.abort();
  }, [tripId]);

  return (
    <div>
      <PageHeader
        title="Schemă autocar"
        subtitle="Vezi locurile ocupate pe o cursă fără să faci rezervare"
        actions={
          <button
            onClick={() => {
              setTripDetail(null);
              setSeatInfoMap({});
              setInspectedSeat(null);
              if (tripId) {
                // re-trigger detail fetch by toggling
                const id = tripId;
                setTripId("");
                setTimeout(() => setTripId(id), 0);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reîmprospătează
          </button>
        }
      />

      {/* Selectori rută + cursă */}
      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ruta
          </span>
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            disabled={routesLoading}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          >
            <option value="">{routesLoading ? "Se încarcă rutele…" : "Alege rută…"}</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.origin} → {r.destination} ({r.country})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cursa
          </span>
          <select
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            disabled={!selectedRoute || tripsLoading || trips.length === 0}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-60"
          >
            <option value="">
              {!selectedRoute
                ? "Alege întâi o rută"
                : tripsLoading
                  ? "Caut cursele…"
                  : trips.length === 0
                    ? "Nicio cursă programată"
                    : "Alege cursă…"}
            </option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {fullDateFmt.format(new Date(t.departureAt))} · {t.busLabel} · {t.availableSeats}/{t.totalSeats} libere
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Conținut principal */}
      {!tripId ? (
        <EmptyState
          icon={Armchair}
          title="Selectează o cursă"
          description="Alege ruta și apoi cursa concretă din lista de mai sus. Vei vedea schema autocarului cu locurile ocupate. Click pe un loc ocupat pentru a vedea cine l-a rezervat."
        />
      ) : detailLoading || !tripDetail ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <BusIcon className="h-4 w-4 text-orange-500" />
              {selectedRoute && (
                <span className="font-semibold text-slate-900">
                  {selectedRoute.origin} → {selectedRoute.destination}
                </span>
              )}
              <span className="text-slate-300">·</span>
              <span>{trips.find((t) => t.id === tripId)?.busLabel ?? ""}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700">
                {tripDetail.occupiedSeats.length}/
                {trips.find((t) => t.id === tripId)?.totalSeats ?? "?"} locuri ocupate
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Click pe un loc ocupat pentru detalii pasager. Locurile libere sunt afișate doar
              informativ — această pagină nu permite rezervare directă.
            </p>
          </div>

          <SeatPicker
            layout={tripDetail.layout}
            occupiedSeats={tripDetail.occupiedSeats}
            selected={[]}
            onSelect={() => {
              /* read-only — alegerea de locuri libere nu face nimic aici */
            }}
            max={0}
            onSeatInspect={(n) => setInspectedSeat(n)}
          />

          {inspectedSeat !== null && (
            <SeatDetailCard
              seatNumber={inspectedSeat}
              info={seatInfoMap[inspectedSeat] ?? null}
              onClose={() => setInspectedSeat(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SeatDetailCard({
  seatNumber,
  info,
  onClose,
}: {
  seatNumber: number;
  info: SeatInfo | null;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
            Loc {seatNumber}
          </div>
          {info ? (
            <div className="mt-2 space-y-1 text-sm">
              <div className="text-lg font-bold text-slate-900">
                {info.passengerName || "(fără nume)"}
              </div>
              <div className="text-slate-700">
                Rezervare <span className="font-mono font-semibold">{info.bookingNumber}</span> ·{" "}
                <span className="font-medium uppercase tracking-wider">{info.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                <a href={`tel:${info.phone}`} className="text-orange-700 hover:underline">
                  {info.phone}
                </a>
                <span className="text-slate-300">·</span>
                <a href={`mailto:${info.email}`} className="text-orange-700 hover:underline">
                  {info.email}
                </a>
              </div>
              <div className="pt-2">
                <a
                  href={`/admin/bookings?search=${info.bookingNumber}`}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100"
                >
                  Deschide rezervarea →
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-600">
              Loc rezervat fără pasager asociat în DB (date legacy sau rezervare anulată în curs).
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-orange-100"
          aria-label="Închide panoul"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
