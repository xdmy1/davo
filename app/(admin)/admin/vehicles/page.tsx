"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  RefreshCw,
  Search,
  Navigation,
  Power,
  Satellite,
  Zap,
  Signal,
  MapPin,
  X,
  Truck,
  Gauge,
  Circle,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

const FleetMap = dynamic(() => import("@/components/admin/FleetMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-400">
      Se încarcă harta…
    </div>
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
type Detail = Vehicle & {
  imei: string | null;
  hwName: string | null;
  createdAt: number | null;
  rawParams: Record<string, string | number | null>;
};

const STATUS_META: Record<Status, { label: string; dot: string; text: string; chip: string }> = {
  moving: { label: "În mișcare", dot: "bg-emerald-500", text: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700" },
  idle: { label: "Motor pornit", dot: "bg-amber-500", text: "text-amber-600", chip: "bg-amber-50 text-amber-700" },
  stopped: { label: "Oprit", dot: "bg-blue-500", text: "text-blue-600", chip: "bg-blue-50 text-blue-700" },
  offline: { label: "Offline", dot: "bg-slate-400", text: "text-slate-500", chip: "bg-slate-100 text-slate-500" },
};
const STATUS_ORDER: Record<Status, number> = { moving: 0, idle: 1, stopped: 2, offline: 3 };

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
  return new Date(unix * 1000).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;

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
      } else {
        setError(data?.error ?? "Eroare la încărcarea flotei");
      }
    } catch {
      setError("Nu s-a putut contacta serverul GPS");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (autoRef.current) load(true);
    }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const openDetail = useCallback(async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`);
      const data = await res.json();
      if (data?.success) setDetail(data.vehicle);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filtered = vehicles
    .filter((v) => v.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, "ro"));

  return (
    <div>
      <PageHeader
        title="Mașini GPS"
        subtitle={
          fetchedAt
            ? `Flotă live din Gelios · actualizat ${fmtTime(Math.floor(fetchedAt / 1000))}`
            : "Flotă live din Gelios"
        }
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

      {/* Summary */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryChip label="Total" value={summary.total} tone="slate" icon={Truck} />
          <SummaryChip label="În mișcare" value={summary.moving} tone="emerald" />
          <SummaryChip label="Motor pornit" value={summary.idle} tone="amber" />
          <SummaryChip label="Oprite" value={summary.stopped} tone="blue" />
          <SummaryChip label="Offline" value={summary.offline} tone="slate" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        {/* Map */}
        <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:h-[640px]">
          <FleetMap
            vehicles={vehicles.map((v) => ({
              id: v.id,
              name: v.name,
              lat: v.lat,
              lon: v.lon,
              status: v.status,
              speed: v.speed,
              course: v.course,
            }))}
            selectedId={selectedId}
            onSelect={openDetail}
          />
        </div>

        {/* List */}
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
                    onClick={() => openDetail(v.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      selectedId === v.id ? "bg-orange-50" : ""
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[v.status].dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">{v.name}</span>
                        {v.status === "moving" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            <Navigation className="h-3 w-3" /> {v.speed} km/h
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className={STATUS_META[v.status].text}>{STATUS_META[v.status].label}</span>
                        <span>·</span>
                        <span>{fmtAge(v.ageSec)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-slate-400">
                      {v.ignition !== null && (
                        <Power className={`h-3.5 w-3.5 ${v.ignition ? "text-emerald-500" : "text-slate-300"}`} />
                      )}
                      {v.sats !== null && (
                        <span className="inline-flex items-center gap-0.5 text-[11px]">
                          <Satellite className="h-3 w-3" /> {v.sats}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-slate-400">Niciun vehicul găsit.</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {selectedId !== null && (
        <DetailModal
          detail={detail}
          loading={detailLoading}
          fallback={vehicles.find((v) => v.id === selectedId) ?? null}
          onClose={() => {
            setSelectedId(null);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
};

function SummaryChip({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon ? (
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${TONE[tone]}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Circle className={`h-2.5 w-2.5 ${TONE[tone]} rounded-full`} fill="currentColor" />
        )}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function DetailModal({
  detail,
  loading,
  fallback,
  onClose,
}: {
  detail: Detail | null;
  loading: boolean;
  fallback: Vehicle | null;
  onClose: () => void;
}) {
  const v = detail ?? fallback;
  if (!v) return null;
  const meta = STATUS_META[v.status];
  const hasPos = v.lat !== null && v.lon !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.chip}`}>
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-mono text-lg font-bold text-slate-900">{v.name}</h3>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.text}`}>
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} /> {meta.label} · {fmtAge(v.ageSec)}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Închide" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          <Metric icon={Navigation} label="Viteză" value={`${v.speed} km/h`} />
          <Metric icon={Power} label="Contact" value={v.ignition === null ? "—" : v.ignition ? "Pornit" : "Oprit"} />
          <Metric icon={Satellite} label="Sateliți" value={v.sats ?? "—"} />
          <Metric icon={Zap} label="Tensiune" value={v.voltage !== null ? `${v.voltage} V` : "—"} />
          <Metric icon={Gauge} label="Baterie" value={v.battery !== null ? `${v.battery} V` : "—"} />
          <Metric icon={Signal} label="Semnal GSM" value={v.gsm !== null ? `${v.gsm}/5` : "—"} />
        </div>

        <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm">
          <Row label="Ultima poziție" value={fmtTime(v.lastUpdate)} />
          <Row label="Coordonate" value={hasPos ? `${v.lat!.toFixed(5)}, ${v.lon!.toFixed(5)}` : "—"} />
          {v.driver && <Row label="Șofer" value={v.driver} />}
          {v.phone && <Row label="Telefon dispozitiv" value={v.phone} />}
          {detail?.imei && <Row label="IMEI" value={detail.imei} />}
          {detail?.hwName && <Row label="Dispozitiv" value={detail.hwName} />}
          {loading && <div className="text-xs text-slate-400">Se încarcă detalii…</div>}
        </div>

        {hasPos && (
          <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
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
              Deschide în Gelios
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
