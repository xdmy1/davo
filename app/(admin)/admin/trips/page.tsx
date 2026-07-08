"use client";

import { useEffect, useState } from "react";
import { Plus, CalendarClock, Bus as BusIcon, Sparkles, Mail, X, Users, Phone, MapPin, Ticket } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/admin/Badge";
import EmptyState from "@/components/admin/EmptyState";
import type { MockTrip, MockRoute, MockBus, TripStatus } from "@/lib/adminMock";
import { tripStatusMeta } from "@/lib/adminLabels";

const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Filter = "all" | "upcoming" | "active" | "past";

export default function TripsPage() {
  const [trips, setTrips] = useState<MockTrip[]>([]);
  const [routes, setRoutes] = useState<MockRoute[]>([]);
  const [buses, setBuses] = useState<MockBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [viewingTripId, setViewingTripId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [routeFilter, setRouteFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    try {
      const [t, r, b] = await Promise.all([
        fetch("/api/admin/trips").then((r) => r.json()),
        fetch("/api/admin/routes").then((r) => r.json()),
        fetch("/api/admin/buses").then((r) => r.json()),
      ]);
      if (t?.success) setTrips(t.trips);
      if (r?.success) setRoutes(r.routes);
      if (b?.success) setBuses(b.buses);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Lista distinctă a rutelor pentru dropdown — derivată din curse, sortată.
  // Folosim eticheta vizibilă a rutei ca să nu trebuiască mapping.
  const allRouteLabels = Array.from(new Set(trips.map((t) => t.routeLabel))).sort();

  const now = Date.now();
  const visible = trips.filter((t) => {
    const ts = new Date(t.departureAt).getTime();
    if (filter === "upcoming" && !(ts >= now && t.status !== "completed")) return false;
    if (filter === "active" && !(t.status === "boarding" || t.status === "en_route")) return false;
    if (filter === "past" && !(ts < now || t.status === "completed" || t.status === "cancelled")) return false;
    // Filtru rută (după label complet)
    if (routeFilter !== "all" && t.routeLabel !== routeFilter) return false;
    // Filtru dată exactă (YYYY-MM-DD în Europe/Chișinău, conform admin)
    if (dateFilter) {
      const dep = new Date(t.departureAt);
      const depKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Chisinau",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(dep);
      if (depKey !== dateFilter) return false;
    }
    return true;
  });

  // Grupare pe CURSĂ FIZICĂ (autocar + zi + direcție), afișată pe ȚARĂ — ca
  // panoul operatorilor. O cursă cuprinde toate orașele/țările acelui autocar în
  // ziua aia (poate mai multe țări).
  const cursMap = new Map<string, {
    key: string; tripIds: string[]; anyTripId: string; busLabel: string; busPlate: string | null;
    departureAt: string; inbound: boolean; _c: Set<string>; booked: number; capacity: number; statuses: Set<TripStatus>;
  }>();
  for (const t of visible) {
    const inbound = /moldova/i.test(t.destinationCountry || "");
    const country = (inbound ? t.originCountry : t.destinationCountry) || "";
    const dk = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Chisinau", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t.departureAt));
    const key = `${dk}|${t.busId}|${inbound ? 1 : 0}`;
    let c = cursMap.get(key);
    if (!c) { c = { key, tripIds: [], anyTripId: t.id, busLabel: t.busLabel, busPlate: t.busPlate ?? null, departureAt: t.departureAt, inbound, _c: new Set(), booked: 0, capacity: t.capacity, statuses: new Set() }; cursMap.set(key, c); }
    c.tripIds.push(t.id);
    if (country && !/moldova/i.test(country)) c._c.add(country);
    c.booked += t.booked; c.statuses.add(t.status);
    if (t.departureAt < c.departureAt) c.departureAt = t.departureAt;
  }
  const curse = [...cursMap.values()]
    .map((c) => ({ ...c, countries: [...c._c].sort((a, b) => a.localeCompare(b, "ro")) }))
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt));

  async function setCursaStatus(ids: string[], status: TripStatus) {
    await Promise.all(ids.map((id) => fetch(`/api/admin/trips/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })));
    load();
  }

  async function sendManifest(id: string) {
    const force = confirm(
      "Trimit manifest pe adresa admin pentru această cursă. Apasă OK ca să forțezi retrimitere (chiar dacă deja a plecat un manifest); Cancel = doar dacă nu s-a trimis."
    );
    const res = await fetch(`/api/admin/trips/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-manifest", force }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message ?? "Manifest trimis.");
    } else {
      alert(data.error ?? "Eroare la trimitere");
    }
  }

  async function generateAll() {
    if (!confirm("Generez curse pentru următoarele 8 săptămâni pe toate rutele cu program activ?")) return;
    setGenerating(true);
    setGenerateMsg(null);
    try {
      const res = await fetch("/api/admin/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all", weeks: 8 }),
      });
      const data = await res.json();
      if (!data.success) {
        setGenerateMsg(`Eroare: ${data.error ?? "necunoscută"}`);
        return;
      }
      setGenerateMsg(
        `✓ ${data.created} curse create, ${data.skipped} existente sărite (${data.routes} rute analizate).`
      );
      await load();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Curse"
        subtitle="Plecări concrete cu autocar asignat"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={generateAll}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generating ? "Generez…" : "Generează 8 săptămâni"}
            </button>
            <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600">
              <Plus className="h-3.5 w-3.5" /> Cursă nouă
            </button>
          </div>
        }
      />

      {generateMsg && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {generateMsg}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {(["upcoming", "active", "past", "all"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {({ all: "Toate", upcoming: "Viitoare", active: "În desfășurare", past: "Finalizate" } as Record<Filter, string>)[f]}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            title="Filtrează după data plecării"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50"
              title="Șterge filtrul de dată"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 max-w-[260px]"
          title="Filtrează după rută"
        >
          <option value="all">Toate rutele</option>
          {allRouteLabels.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {(dateFilter || routeFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setDateFilter(""); setRouteFilter("all"); }}
            className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
            title="Șterge toate filtrele"
          >
            Resetează
          </button>
        )}

        <span className="ml-auto text-xs text-slate-500">{visible.length} curse</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nicio cursă"
          description="Creează prima cursă alegând o rută, un autocar și o dată de plecare."
        />
      ) : (
        <div className="space-y-3">
          {curse.map((c) => {
            const pct = c.capacity > 0 ? Math.round((c.booked / c.capacity) * 100) : 0;
            const dest = c.countries.join(", ") || "—";
            const routeStr = c.inbound ? `${dest} → Chișinău` : `Chișinău → ${dest}`;
            const uniform = c.statuses.size === 1 ? [...c.statuses][0] : null;
            const meta = uniform ? tripStatusMeta[uniform] : null;
            return (
              <div
                key={c.key}
                onClick={() => setViewingTripId(c.anyTripId)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow"
                title="Click pentru pasageri și schimbarea autocarului"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <BusIcon className="h-3.5 w-3.5 text-orange-500" />
                      <span>{c.busLabel}{c.busPlate ? ` · ${c.busPlate}` : ""}</span>
                      <span className="text-slate-300">·</span>
                      <span>{new Date(c.departureAt).toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "long", timeZone: "Europe/Chisinau" })}</span>
                    </div>
                    <div className="mt-1 truncate text-base font-bold text-slate-900">{routeStr}</div>
                    <div className="text-xs text-slate-500">{c.tripIds.length} {c.tripIds.length === 1 ? "oraș/rută" : "orașe/rute"}</div>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{c.booked}/{c.capacity}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <select
                        value={uniform ?? ""}
                        onChange={(e) => e.target.value && setCursaStatus(c.tripIds, e.target.value as TripStatus)}
                        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold focus:outline-none"
                      >
                        {!uniform && <option value="">— mixt —</option>}
                        {(Object.keys(tripStatusMeta) as TripStatus[]).map((s) => (
                          <option key={s} value={s}>{tripStatusMeta[s].label}</option>
                        ))}
                      </select>
                      {meta && <Badge variant={meta.variant}>{meta.label}</Badge>}
                    </div>
                    <button
                      onClick={() => sendManifest(c.anyTripId)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-orange-600"
                      title="Trimite manifest pe email admin"
                    >
                      <Mail className="h-3.5 w-3.5" /> Manifest
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <TripModal
          routes={routes}
          buses={buses}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}

      {viewingTripId && (
        <TripPassengersModal tripId={viewingTripId} buses={buses} onClose={() => setViewingTripId(null)} />
      )}
    </div>
  );
}

type ManifestPassenger = {
  bookingNumber: string;
  isParcel: boolean;
  passengerNames: string;
  phone: string;
  email: string;
  arrivalCity: string;
  seats: number[];
  paxCount: number;
  price: number;
  currency: string;
  payMethod: string | null;
  parcelDetails: string | null;
};

type Manifest = {
  origin: string;
  originCountry: string;
  destination: string;
  destinationCountry: string;
  departureDate: string;
  localTime: string;
  busLabel: string;
  totalSeats: number;
  passengers: ManifestPassenger[];
};

function TripPassengersModal({ tripId, buses, onClose }: { tripId: string; buses: MockBus[]; onClose: () => void }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Schimbare autocar (remapează locurile + anunță pasagerii).
  const [newBusId, setNewBusId] = useState("");
  const [notify, setNotify] = useState(true);
  const [changing, setChanging] = useState(false);
  const [changeMsg, setChangeMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const activeBuses = buses.filter((b) => b.active);

  const changeBus = async () => {
    if (!newBusId) return;
    if (!confirm(notify ? "Schimbi autobuzul pentru TOATĂ cursa (toate orașele acestei zile) și trimiți email tuturor pasagerilor cu locul nou?" : "Schimbi autobuzul pentru TOATĂ cursa (toate orașele), fără email?")) return;
    setChanging(true);
    setChangeMsg(null);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}/change-bus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: newBusId, notify }),
      });
      const d = await res.json();
      if (d.success) {
        const parts = [`${d.tripsChanged} curse (toate orașele)`, `${d.passengers} pasageri`, `${d.seatsKept} locuri păstrate`];
        if (d.seatsChanged) parts.push(`${d.seatsChanged} mutate`);
        if (d.unseated) parts.push(`${d.unseated} fără loc`);
        if (notify) parts.push(`${d.emailsSent} emailuri trimise${d.emailsFailed ? ` · ${d.emailsFailed} eșuate` : ""}`);
        setChangeMsg({ ok: true, text: `Autocar schimbat: ${d.busLabel}. ${parts.join(" · ")}.` });
        setNewBusId("");
        setReloadKey((k) => k + 1);
      } else {
        setChangeMsg({ ok: false, text: d.error || "Eroare" });
      }
    } catch {
      setChangeMsg({ ok: false, text: "Eroare de rețea" });
    } finally {
      setChanging(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/trips/${tripId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d?.success) {
          setError(d?.error ?? "Eroare la încărcare");
          return;
        }
        setManifest(d.manifest);
      })
      .catch(() => !cancelled && setError("Eroare de rețea"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tripId, reloadKey]);

  const totalPax = manifest?.passengers.reduce((s, p) => s + p.paxCount, 0) ?? 0;
  const totalSeats = manifest?.passengers.reduce((s, p) => s + p.seats.length, 0) ?? 0;
  const totalRevenue = manifest?.passengers.reduce((s, p) => s + p.price, 0) ?? 0;
  const occupancy = manifest && manifest.totalSeats > 0 ? Math.round((totalSeats / manifest.totalSeats) * 100) : 0;
  const currencies = manifest ? Array.from(new Set(manifest.passengers.map((p) => p.currency))).filter(Boolean) : [];
  const revenueLabel =
    currencies.length === 1
      ? `${totalRevenue} ${currencies[0] === "GBP" ? "£" : currencies[0] === "EUR" ? "€" : currencies[0]}`
      : currencies.length > 1
        ? `${totalRevenue} (mixt)`
        : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900">
              {manifest
                ? `${manifest.origin} → ${manifest.destination}`
                : loading
                  ? "Se încarcă…"
                  : "Cursă"}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Închide">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : !manifest ? (
          <div className="p-6 text-sm text-slate-500">Date indisponibile.</div>
        ) : (
          <div className="p-5">
            {/* Stats grid */}
            <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Plecare" value={
                <span>
                  {new Date(manifest.departureDate).toLocaleDateString("ro-RO", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    timeZone: "Europe/Chisinau",
                  })}
                  <br />
                  <span className="text-orange-600 font-bold">{manifest.localTime}</span>
                </span>
              } />
              <Stat label="Autocar" value={manifest.busLabel} />
              <Stat label="Ocupare" value={
                <span>
                  {totalSeats}/{manifest.totalSeats} <span className="text-slate-500">({occupancy}%)</span>
                  <br />
                  <span className="text-xs text-slate-500">{totalPax} pasageri</span>
                </span>
              } />
              <Stat label="Total încasat" value={revenueLabel} />
            </div>

            {/* Schimbă autocarul — remapează locurile + anunță pasagerii */}
            <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-700">Schimbă autocarul (toată cursa)</div>
              <p className="mt-0.5 text-xs text-slate-500">
                Afectează TOATĂ cursa fizică — toate orașele acestui autocar în ziua &amp; direcția asta. Locurile tuturor se mută pe același număr (sau altul liber){manifest.passengers.length > 0 ? "; pasagerii primesc email cu locul nou" : ""}.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={newBusId}
                  onChange={(e) => setNewBusId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">— alege autocarul nou —</option>
                  {activeBuses.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}{b.plate ? ` · ${b.plate}` : ""} ({b.totalSeats} locuri)</option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-orange-500" />
                  Anunță pasagerii prin email
                </label>
                <button
                  onClick={changeBus}
                  disabled={!newBusId || changing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {changing ? "Se schimbă…" : "Schimbă autocarul"}
                </button>
              </div>
              {changeMsg && (
                <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${changeMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {changeMsg.text}
                </div>
              )}
            </div>

            {/* Passengers table */}
            {manifest.passengers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Nicio rezervare pe această cursă.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Pasager</th>
                      <th className="px-3 py-2 text-left">Contact</th>
                      <th className="px-3 py-2 text-left">Destinație</th>
                      <th className="px-3 py-2 text-center">Loc</th>
                      <th className="px-3 py-2 text-right">Tarif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifest.passengers.map((p) => (
                      <tr key={p.bookingNumber} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900">
                            {p.passengerNames}
                            {p.isParcel && (
                              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                Colet
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-slate-500">{p.bookingNumber}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 text-xs text-slate-700">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <a href={`tel:${p.phone}`} className="hover:text-orange-600">{p.phone}</a>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            <a href={`mailto:${p.email}`} className="hover:text-orange-600">{p.email}</a>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-start gap-1 text-xs text-slate-700">
                            <MapPin className="mt-0.5 h-3 w-3 text-slate-400 shrink-0" />
                            <span>{p.arrivalCity}</span>
                          </div>
                          {!p.isParcel && p.paxCount > 1 && (
                            <div className="mt-0.5 text-[11px] text-slate-500">{p.paxCount} pax</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {p.seats.length > 0 ? (
                            <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                              <Ticket className="h-3 w-3 text-orange-500" />
                              {p.seats.join(", ")}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="font-semibold text-slate-900">
                            {p.price} {p.currency === "GBP" ? "£" : p.currency === "EUR" ? "€" : p.currency}
                          </div>
                          {p.payMethod && (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {payLabel(p.payMethod)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function payLabel(m: string): string {
  if (m === "cash_on_pickup") return "Cash la îmbarcare";
  if (m === "card_on_pickup") return "Card la îmbarcare";
  if (m === "paid_in_advance") return "Achitată în avans";
  if (m === "cash_on_delivery") return "Cash la livrare";
  return m;
}

function TripModal({
  routes,
  buses,
  onClose,
  onSaved,
}: {
  routes: MockRoute[];
  buses: MockBus[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const activeRoutes = routes.filter((r) => r.active);
  const activeBuses = buses.filter((b) => b.active);
  const [routeId, setRouteId] = useState(activeRoutes[0]?.id ?? "");
  const [busId, setBusId] = useState(activeBuses[0]?.id ?? "");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return toLocalInput(d);
  });
  const [durationHours, setDurationHours] = useState(30);
  const [repeatWeekly, setRepeatWeekly] = useState(0);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!routeId || !busId) {
      alert("Alege o rută activă și un autocar activ.");
      return;
    }
    setSaving(true);
    try {
      const dep = new Date(date);
      const arr = new Date(dep.getTime() + durationHours * 3600 * 1000);
      const res = await fetch("/api/admin/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          busId,
          departureAt: dep.toISOString(),
          arrivalAt: arr.toISOString(),
          repeatWeekly,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error ?? "Eroare la creare");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <CalendarClock className="h-4 w-4 text-orange-500" />
          <h3 className="text-base font-semibold text-slate-900">Cursă nouă</h3>
        </div>
        <form className="grid gap-4 px-5 py-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Rută</span>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className={inputCls} required>
              {activeRoutes.length === 0 && <option value="">Nicio rută activă</option>}
              {activeRoutes.map((r) => (
                <option key={r.id} value={r.id}>{r.origin} → {r.destination} ({r.country})</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Autocar</span>
            <select value={busId} onChange={(e) => setBusId(e.target.value)} className={inputCls} required>
              {activeBuses.length === 0 && <option value="">Niciun autocar activ</option>}
              {activeBuses.map((b) => (
                <option key={b.id} value={b.id}>{b.label} · {b.plate} · {b.totalSeats} locuri</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Plecare</span>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Durată (h)</span>
              <input type="number" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className={inputCls} min={1} max={72} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Repetă săptămânal (copii suplimentare)</span>
            <input type="number" value={repeatWeekly} onChange={(e) => setRepeatWeekly(Number(e.target.value))} className={inputCls} min={0} max={52} />
            <span className="mt-1 block text-[11px] text-slate-500">
              0 = doar cursa asta. 12 = cursa + 12 copii săptămânale (total {repeatWeekly + 1} curse).
            </span>
          </label>
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Anulează</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
              {saving ? "Salvez…" : "Creează"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toLocalInput(d: Date) {
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 16);
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200";
