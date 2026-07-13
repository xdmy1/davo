"use client";

import { useEffect, useState } from "react";
import {
  Fuel,
  Plus,
  Droplet,
  Truck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Gauge,
  X,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";

type Tank = { capacity: number; liters: number };
type Entry = {
  id: string;
  kind: "refill" | "dispense";
  liters: number;
  plate: string | null;
  vehicle: string | null;
  notes: string | null;
  balanceAfter: number;
  createdByName: string | null;
  createdAt: string;
};
type Stats = { dispensedThisMonth: number; refilledThisMonth: number; opsThisMonth: number };
type BusOption = { plate: string; label: string };

const nf = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });
const fmtL = (n: number) => `${nf.format(n)} l`;

export default function FuelPage() {
  const [tank, setTank] = useState<Tank | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "refill" | "dispense">(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fuel");
      const data = await res.json();
      if (data?.success) {
        setTank(data.tank);
        setEntries(data.entries);
        setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/admin/buses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success) setBuses(d.buses.map((b: { plate: string; label: string }) => ({ plate: b.plate, label: b.label })));
      })
      .catch(() => {});
  }, []);

  async function submit(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error ?? "Eroare la înregistrare");
      return false;
    }
    setModal(null);
    load();
    return true;
  }

  async function remove(entry: Entry) {
    const verb = entry.kind === "refill" ? "adăugarea" : "alimentarea";
    if (!confirm(`Ștergi ${verb} de ${fmtL(entry.liters)}? Stocul rezervorului va fi ajustat înapoi.`)) return;
    const res = await fetch(`/api/admin/fuel/${entry.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      alert(data.error ?? "Eroare la ștergere");
      return;
    }
    load();
  }

  const pct = tank && tank.capacity > 0 ? Math.min(100, (tank.liters / tank.capacity) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Rezervor motorină"
        subtitle="Gestionează stocul de motorină și alimentările vehiculelor"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal("refill")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Droplet className="h-3.5 w-3.5 text-blue-500" /> Adaugă în rezervor
            </button>
            <button
              onClick={() => setModal("dispense")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-3.5 w-3.5" /> Alimentează vehicul
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Tank gauge */}
          <TankGauge tank={tank} pct={pct} />

          {/* Stats */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Stoc curent"
              value={tank ? fmtL(tank.liters) : "—"}
              icon={Gauge}
              tone="orange"
              hint={tank ? `din ${fmtL(tank.capacity)} capacitate` : undefined}
            />
            <StatCard
              label="Alimentat luna asta"
              value={stats ? fmtL(stats.dispensedThisMonth) : "—"}
              icon={TrendingDown}
              tone="red"
              hint="motorină scoasă din rezervor"
            />
            <StatCard
              label="Adăugat luna asta"
              value={stats ? fmtL(stats.refilledThisMonth) : "—"}
              icon={TrendingUp}
              tone="blue"
              hint="motorină pusă în rezervor"
            />
          </div>

          {/* History */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Istoric operații</h2>
              <span className="text-xs text-slate-500">{entries.length} înregistrări</span>
            </div>

            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Fuel className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-600">Nicio operație încă</p>
                <p className="mt-1 text-xs text-slate-400">Apasă „Alimentează vehicul” sau „Adaugă în rezervor” ca să începi.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <EntryRow key={e.id} entry={e} onDelete={() => remove(e)} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {modal === "dispense" && (
        <DispenseModal buses={buses} onClose={() => setModal(null)} onSubmit={submit} />
      )}
      {modal === "refill" && (
        <RefillModal tank={tank} onClose={() => setModal(null)} onSubmit={submit} />
      )}
    </div>
  );
}

function TankGauge({ tank, pct }: { tank: Tank | null; pct: number }) {
  // Culoare în funcție de nivel: roșu jos, chihlimbar mediu, verde plin.
  const level = pct < 15 ? "low" : pct < 35 ? "mid" : "ok";
  const fillClass =
    level === "low"
      ? "from-red-500 to-red-400"
      : level === "mid"
        ? "from-amber-500 to-amber-400"
        : "from-orange-500 to-orange-400";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Fuel className="h-4 w-4 text-orange-500" /> Nivel rezervor
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {tank ? nf.format(tank.liters) : "—"}
            </span>
            <span className="text-lg font-semibold text-slate-400">
              / {tank ? nf.format(tank.capacity) : "—"} l
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums text-slate-900 sm:text-4xl">
            {Math.round(pct)}%
          </div>
          {level === "low" && (
            <div className="mt-1 text-xs font-semibold text-red-600">Nivel scăzut — alimentează rezervorul</div>
          )}
        </div>
      </div>

      {/* Bar */}
      <div className="mt-4 h-6 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillClass} transition-[width] duration-500`}
          style={{ width: `${Math.max(pct, tank && tank.liters > 0 ? 2 : 0)}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-400">
        <span>0 l</span>
        <span>{tank ? nf.format(tank.capacity) : "—"} l</span>
      </div>
    </div>
  );
}

function EntryRow({ entry, onDelete }: { entry: Entry; onDelete: () => void }) {
  const isRefill = entry.kind === "refill";
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="group flex items-center gap-4 px-5 py-3.5">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isRefill ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
        }`}
      >
        {isRefill ? <Droplet className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">
            {isRefill ? "Adăugat în rezervor" : "Alimentare vehicul"}
          </span>
          {entry.plate && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700">
              {entry.plate}
            </span>
          )}
          {entry.vehicle && <span className="text-sm text-slate-500">· {entry.vehicle}</span>}
        </div>
        {entry.notes && <p className="mt-0.5 truncate text-xs text-slate-500">{entry.notes}</p>}
        <div className="mt-0.5 text-[11px] text-slate-400">
          {dateStr}
          {entry.createdByName ? ` · ${entry.createdByName}` : ""} · rămas {fmtL(entry.balanceAfter)}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className={`text-sm font-bold ${isRefill ? "text-blue-600" : "text-orange-600"}`}>
          {isRefill ? "+" : "−"}
          {fmtL(entry.liters)}
        </div>
      </div>

      <button
        onClick={onDelete}
        aria-label="Șterge"
        className="shrink-0 rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Închide" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const NOTE_CHIPS = ["Autobuz DAVO", "Autocar DAVO", "Mașină personală", "Mașina altcuiva"];

function DispenseModal({
  buses,
  onClose,
  onSubmit,
}: {
  buses: BusOption[];
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [liters, setLiters] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit({ kind: "dispense", liters: Number(liters), plate, vehicle, notes });
    if (!ok) setSaving(false);
  }

  // Când alegi o placă de autocar cunoscută, completăm automat modelul.
  function onPlate(v: string) {
    setPlate(v);
    const match = buses.find((b) => b.plate.toLowerCase() === v.trim().toLowerCase());
    if (match && !vehicle) setVehicle(match.label);
  }

  return (
    <ModalShell title="Alimentare vehicul" subtitle="Motorina se scade din rezervor" onClose={onClose}>
      <form className="grid gap-4 px-5 py-4" onSubmit={handle}>
        <Field label="Litri alimentați">
          <input
            type="number"
            step="0.1"
            min="0"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            className={inputCls}
            required
            autoFocus
            placeholder="ex. 300"
          />
        </Field>

        <Field label="Număr înmatriculare">
          <input
            value={plate}
            onChange={(e) => onPlate(e.target.value)}
            className={inputCls}
            list="fuel-plates"
            placeholder="ex. CJ 12 DAV"
          />
          <datalist id="fuel-plates">
            {buses.map((b) => (
              <option key={b.plate} value={b.plate}>
                {b.label}
              </option>
            ))}
          </datalist>
        </Field>

        <Field label="Ce mașină / vehicul">
          <input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            className={inputCls}
            list="fuel-vehicles"
            placeholder="ex. Setra S 516 HD"
          />
          <datalist id="fuel-vehicles">
            {buses.map((b) => (
              <option key={b.plate} value={b.label} />
            ))}
          </datalist>
        </Field>

        <Field label="Notițe">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputCls} min-h-[64px] resize-y`}
            placeholder="ex. mașină personală, a altcuiva, motiv..."
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NOTE_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNotes((n) => (n ? n : c))}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-orange-300 hover:text-orange-600"
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Anulează
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
            {saving ? "Se salvează..." : "Înregistrează alimentarea"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RefillModal({
  tank,
  onClose,
  onSubmit,
}: {
  tank: Tank | null;
  onClose: () => void;
  onSubmit: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [liters, setLiters] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const free = tank ? Math.max(0, tank.capacity - tank.liters) : 0;

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit({ kind: "refill", liters: Number(liters), notes });
    if (!ok) setSaving(false);
  }

  return (
    <ModalShell
      title="Adaugă în rezervor"
      subtitle={tank ? `Spațiu liber: ${fmtL(free)}` : undefined}
      onClose={onClose}
    >
      <form className="grid gap-4 px-5 py-4" onSubmit={handle}>
        <Field label="Litri adăugați în rezervor">
          <input
            type="number"
            step="0.1"
            min="0"
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            className={inputCls}
            required
            autoFocus
            placeholder="ex. 2000"
          />
        </Field>
        <Field label="Notițe">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
            placeholder="ex. furnizor, bon, preț/litru..."
          />
        </Field>
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Anulează
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Se salvează..." : "Adaugă în rezervor"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200";
