"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw, Search, X, MapPin, ExternalLink } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

const FleetMap = dynamic(() => import("@/components/admin/FleetMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-400">Se încarcă harta…</div>
  ),
});

type Status = "moving" | "idle" | "stopped" | "offline";
type Vehicle = {
  id: number;
  name: string;
  status: Status;
  lat: number | null;
  lon: number | null;
  speed: number;
  course: number | null;
  sats: number | null;
  ignition: boolean | null;
  voltage: number | null;
  battery: number | null;
  gsm: number | null;
  lastUpdate: number | null;
  ageSec: number | null;
  phone: string | null;
  hwType: string | null;
  driver: string | null;
};
type Summary = { total: number; moving: number; idle: number; stopped: number; offline: number };
type Detail = Vehicle & { imei: string | null; hwName: string | null; address: string | null };
type TripStats = {
  mileageKm: number;
  movingSec: number;
  parkingSec: number;
  maxSpeed: number;
  avgSpeed: number;
  timeStart: number | null;
  timeEnd: number | null;
};
type FuelEntry = { id: string; liters: number; pricePerLiter: number | null; notes: string | null; at: number };
type Analytics = {
  track: { lat: number; lon: number }[];
  stats: TripStats;
  tables: { name: string; columns: string[]; rows: string[][] }[];
  fuel: { liters: number; cost: number; entries: FuelEntry[] };
  consumption: { l100km: number | null; costPer100: number | null; costPerKm: number | null };
};

const STATUS_META: Record<Status, { label: string; dot: string; text: string }> = {
  moving: { label: "În mișcare", dot: "bg-emerald-500", text: "text-emerald-600" },
  idle: { label: "Motor pornit", dot: "bg-amber-500", text: "text-amber-600" },
  stopped: { label: "Oprit", dot: "bg-blue-500", text: "text-blue-600" },
  offline: { label: "Offline", dot: "bg-slate-400", text: "text-slate-500" },
};
const STATUS_ORDER: Record<Status, number> = { moving: 0, idle: 1, stopped: 2, offline: 3 };

const PERIODS: { key: string; label: string; seconds: number }[] = [
  { key: "1", label: "24h", seconds: 86400 },
  { key: "3", label: "3 zile", seconds: 3 * 86400 },
  { key: "7", label: "7 zile", seconds: 7 * 86400 },
  { key: "30", label: "30 zile", seconds: 30 * 86400 },
];

function fmtAge(sec: number | null): string {
  if (sec === null) return "fără date";
  if (sec < 90) return "chiar acum";
  const m = Math.floor(sec / 60);
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h} h`;
  const d = Math.floor(h / 24);
  return `acum ${d} ${d === 1 ? "zi" : "zile"}`;
}
function fmtTime(unix: number | null): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtDur(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
const money = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 });

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  // Detail / analytics
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [period, setPeriod] = useState("7");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles");
      const data = await res.json();
      if (data?.success) {
        setVehicles(data.vehicles);
        setSummary(data.summary);
        setFetchedAt(data.fetchedAt);
        setError(null);
      } else setError(data?.error ?? "Eroare la încărcarea flotei");
    } catch {
      setError("Nu s-a putut contacta serverul GPS");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => autoRef.current && load(true), 20000);
    return () => clearInterval(t);
  }, [load]);

  const loadAnalytics = useCallback(async (v: Vehicle, periodKey: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    const secs = PERIODS.find((p) => p.key === periodKey)?.seconds ?? 7 * 86400;
    const to = Math.floor(Date.now() / 1000);
    const from = to - secs;
    try {
      const res = await fetch(`/api/admin/vehicles/${v.id}/analytics?from=${from}&to=${to}&plate=${encodeURIComponent(v.name)}`);
      const data = await res.json();
      if (data?.success) setAnalytics(data);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const openDetail = useCallback(
    (v: Vehicle) => {
      setSelected(v);
      setDetail(null);
      setPeriod("7");
      fetch(`/api/admin/vehicles/${v.id}`)
        .then((r) => r.json())
        .then((d) => d?.success && setDetail(d.vehicle))
        .catch(() => {});
      loadAnalytics(v, "7");
    },
    [loadAnalytics]
  );

  function changePeriod(key: string) {
    setPeriod(key);
    if (selected) loadAnalytics(selected, key);
  }

  function close() {
    setSelected(null);
    setDetail(null);
    setAnalytics(null);
  }

  const filtered = vehicles
    .filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "ro"));

  return (
    <div>
      <PageHeader
        title="Mașini GPS"
        subtitle={fetchedAt ? `Flotă live din Gelios · ${fmtTime(Math.floor(fetchedAt / 1000))}` : "Flotă live din Gelios"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-orange-500" />
              Auto 20s
            </label>
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Reîmprospătează
            </button>
          </div>
        }
      />

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryChip label="Total" value={summary.total} dot="bg-slate-300" />
          <SummaryChip label="În mișcare" value={summary.moving} dot="bg-emerald-500" />
          <SummaryChip label="Motor pornit" value={summary.idle} dot="bg-amber-500" />
          <SummaryChip label="Oprite" value={summary.stopped} dot="bg-blue-500" />
          <SummaryChip label="Offline" value={summary.offline} dot="bg-slate-400" />
        </div>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:h-[640px]">
          <FleetMap
            vehicles={vehicles.map((v) => ({ id: v.id, name: v.name, lat: v.lat, lon: v.lon, status: v.status, speed: v.speed, course: v.course }))}
            selectedId={selected?.id ?? null}
            onSelect={(id) => {
              const v = vehicles.find((x) => x.id === id);
              if (v) openDetail(v);
            }}
            track={analytics?.track ?? null}
          />
        </div>

        <div className="flex max-h-[640px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Caută după număr…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>

          {loading && vehicles.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => openDetail(v)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      selected?.id === v.id ? "bg-orange-50" : ""
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[v.status].dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-bold text-slate-900">{v.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        <span className={STATUS_META[v.status].text}>{STATUS_META[v.status].label}</span> · {fmtAge(v.ageSec)}
                      </div>
                    </div>
                    {v.status === "moving" && <span className="shrink-0 text-sm font-bold text-emerald-600">{v.speed} km/h</span>}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">Niciun vehicul găsit.</li>}
            </ul>
          )}
        </div>
      </div>

      {selected && (
        <DetailPanel
          vehicle={selected}
          detail={detail}
          analytics={analytics}
          analyticsLoading={analyticsLoading}
          period={period}
          onPeriod={changePeriod}
          onClose={close}
        />
      )}
    </div>
  );
}

function SummaryChip({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function DetailPanel({
  vehicle,
  detail,
  analytics,
  analyticsLoading,
  period,
  onPeriod,
  onClose,
}: {
  vehicle: Vehicle;
  detail: Detail | null;
  analytics: Analytics | null;
  analyticsLoading: boolean;
  period: string;
  onPeriod: (k: string) => void;
  onClose: () => void;
}) {
  const v = detail ?? vehicle;
  const meta = STATUS_META[v.status];
  const s = analytics?.stats;
  const movingPct = s && s.movingSec + s.parkingSec > 0 ? Math.round((s.movingSec / (s.movingSec + s.parkingSec)) * 100) : null;

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end" role="dialog">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h3 className="font-mono text-xl font-bold text-slate-900">{v.name}</h3>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.text}`}>
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} /> {meta.label} · {fmtAge(v.ageSec)}
            </span>
            {detail?.address && <p className="mt-1 max-w-xs text-xs text-slate-500">{detail.address}</p>}
          </div>
          <button onClick={onClose} aria-label="Închide" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Live telemetry */}
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Viteză" value={`${v.speed} km/h`} />
            <Mini label="Contact" value={v.ignition === null ? "—" : v.ignition ? "Pornit" : "Oprit"} />
            <Mini label="Sateliți" value={v.sats ?? "—"} />
            <Mini label="Tensiune" value={v.voltage !== null ? `${v.voltage} V` : "—"} />
            <Mini label="Baterie" value={v.battery !== null ? `${v.battery} V` : "—"} />
            <Mini label="Semnal" value={v.gsm !== null ? `${v.gsm}/5` : "—"} />
          </div>

          {/* Period selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Analiză pe perioadă</h4>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => onPeriod(p.key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      period === p.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-8 text-sm text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                Se generează raportul din Gelios…
              </div>
            ) : s ? (
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Distanță" value={`${s.mileageKm} km`} accent />
                <Stat label="Viteză max" value={`${s.maxSpeed} km/h`} />
                <Stat label="Viteză medie" value={`${s.avgSpeed} km/h`} />
                <Stat label="Timp mișcare" value={fmtDur(s.movingSec)} />
                <Stat label="Staționare" value={fmtDur(s.parkingSec)} />
                <Stat label="% în mișcare" value={movingPct !== null ? `${movingPct}%` : "—"} />
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">Fără date în perioadă.</p>
            )}
          </div>

          {/* Fuel + consumption */}
          {analytics && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-slate-900">Combustibil & consum</h4>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Alimentat" value={`${money.format(analytics.fuel.liters)} l`} />
                <Stat label="Cost combustibil" value={`${money.format(analytics.fuel.cost)} lei`} />
                <Stat
                  label="Consum"
                  value={analytics.consumption.l100km !== null ? `${analytics.consumption.l100km} l/100km` : "—"}
                  accent
                />
              </div>
              {analytics.consumption.costPer100 !== null && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Stat label="Cost / 100 km" value={`${money.format(analytics.consumption.costPer100)} lei`} />
                  <Stat label="Cost / km" value={`${money.format(analytics.consumption.costPerKm ?? 0)} lei`} />
                </div>
              )}
              {analytics.fuel.entries.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Alimentări în perioadă</div>
                  {analytics.fuel.entries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-slate-600">{fmtTime(e.at)}</span>
                      <span className="font-semibold text-slate-900">
                        {money.format(e.liters)} l
                        {e.pricePerLiter ? ` · ${money.format(e.liters * e.pricePerLiter)} lei` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full Gelios report tables */}
          {analytics?.tables.map((t) => (
            <ReportTableView key={t.name} table={t} />
          ))}

          {/* Device info */}
          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-900">Dispozitiv</h4>
            <div className="space-y-1.5 text-sm">
              <Row label="Ultima poziție" value={fmtTime(v.lastUpdate)} />
              <Row label="Coordonate" value={v.lat !== null && v.lon !== null ? `${v.lat.toFixed(5)}, ${v.lon.toFixed(5)}` : "—"} />
              {v.driver && <Row label="Șofer" value={v.driver} />}
              {v.phone && <Row label="Telefon GPS" value={v.phone} />}
              {detail?.imei && <Row label="IMEI" value={detail.imei} />}
              {detail?.hwName && <Row label="Model" value={detail.hwName} />}
            </div>
          </div>

          {v.lat !== null && v.lon !== null && (
            <div className="flex gap-2">
              <a
                href={`https://www.google.com/maps?q=${v.lat},${v.lon}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <MapPin className="h-4 w-4" /> Google Maps
              </a>
              <a
                href="https://admin.geliospro.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Gelios <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportTableView({ table }: { table: { name: string; columns: string[]; rows: string[][] } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-bold text-slate-900"
      >
        {table.name} <span className="text-xs font-normal text-slate-400">{table.rows.length} rânduri {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                {table.columns.map((c, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  {r.map((cell, ci) => (
                    <td key={ci} className="whitespace-nowrap px-3 py-2 text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? "bg-orange-50" : "bg-slate-50"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-bold ${accent ? "text-orange-600" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}
