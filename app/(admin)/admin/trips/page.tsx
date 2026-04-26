"use client";

import { useEffect, useState } from "react";
import { Plus, CalendarClock, Bus as BusIcon, Sparkles } from "lucide-react";
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

  const now = Date.now();
  const visible = trips.filter((t) => {
    const ts = new Date(t.departureAt).getTime();
    if (filter === "upcoming") return ts >= now && t.status !== "completed";
    if (filter === "active") return t.status === "boarding" || t.status === "en_route";
    if (filter === "past") return ts < now || t.status === "completed" || t.status === "cancelled";
    return true;
  });

  async function setStatus(id: string, status: TripStatus) {
    await fetch(`/api/admin/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Rută</th>
                <th className="px-5 py-3 text-left">Plecare</th>
                <th className="px-5 py-3 text-left">Autocar</th>
                <th className="px-5 py-3 text-left">Ocupare</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((t) => {
                const meta = tripStatusMeta[t.status];
                const pct = t.capacity > 0 ? Math.round((t.booked / t.capacity) * 100) : 0;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{t.routeLabel}</div>
                      <div className="text-xs text-slate-500">ID {t.id.slice(0, 8)}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{dateFmt.format(new Date(t.departureAt))}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <BusIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-700">{t.busLabel}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{t.booked}/{t.capacity}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value as TripStatus)} className="rounded-md border border-transparent bg-transparent text-xs font-semibold focus:outline-none">
                        {(Object.keys(tripStatusMeta) as TripStatus[]).map((s) => (
                          <option key={s} value={s}>{tripStatusMeta[s].label}</option>
                        ))}
                      </select>
                      <div className="mt-1"><Badge variant={meta.variant}>{meta.label}</Badge></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
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
