"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  RefreshCw,
  Plus,
  Gauge,
  Clock,
  AlertTriangle,
  Check,
  Pencil,
  Trash2,
  X,
  MapPin,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/admin/Badge";
import EmptyState from "@/components/admin/EmptyState";
import { MAINT_PRESETS } from "@/lib/maintenance";

type Status = "ok" | "soon" | "overdue" | "unknown";
type Item = {
  id: string;
  geliosUnitId: number;
  vehicleName: string;
  type: string;
  intervalKm: number | null;
  intervalDays: number | null;
  lastServiceKm: number | null;
  lastServiceAt: string;
  notes: string | null;
  currentKm: number | null;
  kmSince: number | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
  status: Status;
  progressPct: number;
  label: string;
  reason: string;
  lastCost: { labor: number | null; parts: number | null; total: number | null } | null;
  totalSpent: number;
};
type VehicleRow = {
  id: number;
  name: string;
  status: string;
  odometerKm: number | null;
  engineHours: number | null;
  items: Item[];
  worst: Status;
  totalSpent: number;
  counts: { overdue: number; soon: number; ok: number };
};
type Summary = { vehicles: number; items: number; overdue: number; soon: number; ok: number; unknown: number };

const STATUS_UI: Record<Status, { badge: "green" | "yellow" | "red" | "slate"; bar: string; dot: string }> = {
  ok: { badge: "green", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  soon: { badge: "yellow", bar: "bg-yellow-400", dot: "bg-yellow-400" },
  overdue: { badge: "red", bar: "bg-red-500", dot: "bg-red-500" },
  unknown: { badge: "slate", bar: "bg-slate-300", dot: "bg-slate-300" },
};

const km = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n).toLocaleString("ro-RO")} km`);
const lei = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} lei`;
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
const SEV: Record<Status, number> = { overdue: 3, soon: 2, ok: 1, unknown: 0 };

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const [addFor, setAddFor] = useState<VehicleRow | "any" | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [serviceItem, setServiceItem] = useState<{ item: Item; vehicle: VehicleRow } | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles/maintenance");
      const data = await res.json();
      if (data?.success) {
        setVehicles(data.vehicles);
        setSummary(data.summary);
        setFetchedAt(data.fetchedAt);
        setError(null);
      } else setError(data?.error ?? "Eroare la încărcare");
    } catch {
      setError("Nu s-a putut contacta serverul");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Vehiculele cu probleme urcă sus; între ele, cele mai încărcate primele.
  const sorted = useMemo(
    () =>
      [...vehicles].sort(
        (a, b) =>
          SEV[b.worst] - SEV[a.worst] ||
          b.items.length - a.items.length ||
          a.name.localeCompare(b.name, "ro")
      ),
    [vehicles]
  );

  return (
    <div>
      <PageHeader
        title="Mentenanță flotă"
        subtitle={
          fetchedAt
            ? `Odometru live din Gelios · ${new Date(fetchedAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`
            : "Odometru live din Gelios"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/vehicles"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <MapPin className="h-3.5 w-3.5" /> Hartă GPS
            </Link>
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Reîmprospătează
            </button>
            <button
              onClick={() => setAddFor("any")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" /> Adaugă punct
            </button>
          </div>
        }
      />

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <SummaryChip label="Vehicule" value={summary.vehicles} dot="bg-slate-300" />
          <SummaryChip label="Puncte" value={summary.items} dot="bg-blue-500" />
          <SummaryChip label="Depășite" value={summary.overdue} dot="bg-red-500" tone={summary.overdue ? "red" : undefined} />
          <SummaryChip label="În curând" value={summary.soon} dot="bg-yellow-400" tone={summary.soon ? "yellow" : undefined} />
          <SummaryChip label="OK" value={summary.ok} dot="bg-emerald-500" />
        </div>
      )}

      {summary && summary.overdue > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>
            <b>{summary.overdue}</b> {summary.overdue === 1 ? "interval depășit" : "intervale depășite"} — trebuie făcut service.
          </span>
        </div>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading && vehicles.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((v) => (
            <VehicleCard
              key={v.id}
              v={v}
              onAdd={() => setAddFor(v)}
              onEdit={(it) => setEditItem(it)}
              onService={(it) => setServiceItem({ item: it, vehicle: v })}
              onDeleted={() => load(true)}
            />
          ))}
        </div>
      )}

      {addFor && (
        <ItemModal
          vehicles={vehicles}
          preset={addFor === "any" ? null : addFor}
          onClose={() => setAddFor(null)}
          onSaved={() => {
            setAddFor(null);
            load(true);
          }}
        />
      )}
      {editItem && (
        <ItemModal
          vehicles={vehicles}
          editItem={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            load(true);
          }}
        />
      )}
      {serviceItem && (
        <ServiceModal
          item={serviceItem.item}
          vehicle={serviceItem.vehicle}
          onClose={() => setServiceItem(null)}
          onSaved={() => {
            setServiceItem(null);
            load(true);
          }}
        />
      )}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  dot,
  tone,
}: {
  label: string;
  value: number;
  dot: string;
  tone?: "red" | "yellow";
}) {
  const border = tone === "red" ? "border-red-200 bg-red-50" : tone === "yellow" ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${border}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function VehicleCard({
  v,
  onAdd,
  onEdit,
  onService,
  onDeleted,
}: {
  v: VehicleRow;
  onAdd: () => void;
  onEdit: (it: Item) => void;
  onService: (it: Item) => void;
  onDeleted: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-slate-900">{v.name}</span>
            {v.worst !== "unknown" && v.items.length > 0 && (
              <Badge variant={STATUS_UI[v.worst].badge}>
                {v.worst === "overdue" ? "Necesită service" : v.worst === "soon" ? "În curând" : "La zi"}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-slate-400" />
              {v.odometerKm != null ? <b className="text-slate-700">{km(v.odometerKm)}</b> : <span className="text-slate-400">fără odometru</span>}
            </span>
            {v.engineHours != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> {Math.round(v.engineHours).toLocaleString("ro-RO")} h
              </span>
            )}
            {v.totalSpent > 0 && (
              <span className="inline-flex items-center gap-1" title="Total cheltuit pe mentenanță">
                <Wrench className="h-3.5 w-3.5 text-slate-400" /> <b className="text-slate-700">{lei(v.totalSpent)}</b>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" /> Punct
        </button>
      </div>

      {v.items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-400">
          Niciun punct de mentenanță. Apasă „Punct" ca să adaugi (ex: ulei la 30.000 km).
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {v.items.map((it) => (
            <ItemRow key={it.id} it={it} onEdit={() => onEdit(it)} onService={() => onService(it)} onDeleted={onDeleted} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemRow({
  it,
  onEdit,
  onService,
  onDeleted,
}: {
  it: Item;
  onEdit: () => void;
  onService: () => void;
  onDeleted: () => void;
}) {
  const ui = STATUS_UI[it.status];
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm(`Ștergi punctul „${it.type}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/vehicles/maintenance/${it.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  const interval =
    it.intervalKm && it.intervalDays
      ? `${km(it.intervalKm)} / ${it.intervalDays} zile`
      : it.intervalKm
        ? `la ${km(it.intervalKm)}`
        : it.intervalDays
          ? `la ${it.intervalDays} zile`
          : "";

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${ui.dot}`} />
            <span className="truncate text-sm font-semibold text-slate-900">{it.type}</span>
            <span className="shrink-0 text-[11px] text-slate-400">· {interval}</span>
          </div>

          {/* Bara de progres colorată */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${ui.bar} transition-all`} style={{ width: `${it.progressPct}%` }} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px]">
            <span
              className={
                it.status === "overdue"
                  ? "font-bold text-red-600"
                  : it.status === "soon"
                    ? "font-semibold text-yellow-700"
                    : it.status === "ok"
                      ? "text-emerald-600"
                      : "text-slate-400"
              }
            >
              {it.reason}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">
              ultimul: {fmtDate(it.lastServiceAt)}
              {it.lastServiceKm != null ? ` · ${km(it.lastServiceKm)}` : ""}
            </span>
            {it.lastCost?.total != null && it.lastCost.total > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span
                  className="font-semibold text-slate-600"
                  title={`Manoperă ${lei(it.lastCost.labor ?? 0)} + Piese ${lei(it.lastCost.parts ?? 0)}`}
                >
                  {lei(it.lastCost.total)}
                </span>
              </>
            )}
          </div>
          {it.notes && <div className="mt-1 text-[11px] italic text-slate-400">{it.notes}</div>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onService}
            title="Marchează service făcut"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <Check className="h-3.5 w-3.5" /> Făcut
          </button>
          <button onClick={onEdit} title="Editează" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={del} disabled={busy} title="Șterge" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ---- Modal add / edit punct ----
function ItemModal({
  vehicles,
  preset,
  editItem,
  onClose,
  onSaved,
}: {
  vehicles: VehicleRow[];
  preset?: VehicleRow | null;
  editItem?: Item;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!editItem;
  const initialUnit = editItem?.geliosUnitId ?? preset?.id ?? vehicles[0]?.id ?? 0;
  const [unitId, setUnitId] = useState<number>(initialUnit);
  const [type, setType] = useState(editItem?.type ?? "");
  const [intervalKm, setIntervalKm] = useState<string>(editItem?.intervalKm ? String(editItem.intervalKm) : "");
  const [intervalDays, setIntervalDays] = useState<string>(editItem?.intervalDays ? String(editItem.intervalDays) : "");
  const [lastKm, setLastKm] = useState<string>(editItem?.lastServiceKm != null ? String(Math.round(editItem.lastServiceKm)) : "");
  const [lastAt, setLastAt] = useState<string>(
    (editItem?.lastServiceAt ?? new Date().toISOString()).slice(0, 10)
  );
  const [notes, setNotes] = useState(editItem?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const vehicle = vehicles.find((v) => v.id === unitId);
  const currentKm = vehicle?.odometerKm ?? null;

  function applyPreset(name: string) {
    const p = MAINT_PRESETS.find((x) => x.type === name);
    if (!p) return;
    setType(p.type);
    setIntervalKm(p.intervalKm ? String(p.intervalKm) : "");
    setIntervalDays(p.intervalDays ? String(p.intervalDays) : "");
  }

  async function save() {
    setErr(null);
    if (!type.trim()) return setErr("Alege sau scrie tipul.");
    if (!intervalKm && !intervalDays) return setErr("Setează cel puțin un interval (km sau zile).");
    setSaving(true);
    try {
      const payload = {
        geliosUnitId: unitId,
        vehicleName: vehicles.find((v) => v.id === unitId)?.name ?? "",
        type: type.trim(),
        intervalKm: intervalKm || null,
        intervalDays: intervalDays || null,
        lastServiceKm: lastKm || null,
        lastServiceAt: lastAt ? new Date(lastAt).toISOString() : undefined,
        notes: notes.trim() || null,
      };
      const url = editing ? `/api/admin/vehicles/maintenance/${editItem!.id}` : "/api/admin/vehicles/maintenance";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) onSaved();
      else setErr(data?.error ?? "Eroare la salvare");
    } catch {
      setErr("Eroare de rețea");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={editing ? "Editează punct" : "Adaugă punct de mentenanță"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Vehicul">
          <select
            value={unitId}
            onChange={(e) => setUnitId(Number(e.target.value))}
            disabled={editing}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-slate-50"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.odometerKm != null ? `· ${km(v.odometerKm)}` : ""}
              </option>
            ))}
          </select>
        </Field>

        {!editing && (
          <Field label="Preset rapid (opțional)">
            <select
              defaultValue=""
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">— alege un tip predefinit —</option>
              {MAINT_PRESETS.map((p) => (
                <option key={p.type} value={p.type}>
                  {p.type} {p.intervalKm ? `(${km(p.intervalKm)})` : p.intervalDays ? `(${p.intervalDays} zile)` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Tip">
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="ex: Ulei motor + filtru"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Interval km">
            <input
              type="number"
              value={intervalKm}
              onChange={(e) => setIntervalKm(e.target.value)}
              placeholder="ex: 30000"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
          <Field label="Interval zile">
            <input
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              placeholder="ex: 365 (ITP)"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Odometru la ultima efectuare">
            <div className="flex gap-1.5">
              <input
                type="number"
                value={lastKm}
                onChange={(e) => setLastKm(e.target.value)}
                placeholder={currentKm != null ? String(Math.round(currentKm)) : "km"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              {currentKm != null && (
                <button
                  type="button"
                  onClick={() => setLastKm(String(Math.round(currentKm)))}
                  title="Folosește km curent din Gelios"
                  className="shrink-0 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Acum
                </button>
              )}
            </div>
          </Field>
          <Field label="Data ultimei efectuări">
            <input
              type="date"
              value={lastAt}
              onChange={(e) => setLastAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
        </div>
        {!editing && currentKm != null && !lastKm && (
          <p className="text-[11px] text-slate-400">
            Lăsat gol → pornim numărătoarea de la odometrul curent ({km(currentKm)}).
          </p>
        )}

        <Field label="Notițe (opțional)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: ulei 10W40, service Auto XYZ"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </Field>

        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Anulează
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? "Se salvează…" : editing ? "Salvează" : "Adaugă"}
        </button>
      </div>
    </ModalShell>
  );
}

// ---- Modal service făcut ----
function ServiceModal({
  item,
  vehicle,
  onClose,
  onSaved,
}: {
  item: Item;
  vehicle: VehicleRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serviceKm, setServiceKm] = useState<string>(vehicle.odometerKm != null ? String(Math.round(vehicle.odometerKm)) : "");
  const [serviceAt, setServiceAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = (Number(laborCost) || 0) + (Number(partsCost) || 0);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/vehicles/maintenance/${item.id}/service`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceKm: serviceKm || null,
          serviceAt: serviceAt ? new Date(serviceAt).toISOString() : undefined,
          laborCost: laborCost || null,
          partsCost: partsCost || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data?.success) onSaved();
      else setErr(data?.error ?? "Eroare");
    } catch {
      setErr("Eroare de rețea");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Am făcut service" onClose={onClose}>
      <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
        <div className="font-semibold text-slate-900">
          <span className="font-mono">{vehicle.name}</span> · {item.type}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          Odometru curent Gelios: <b className="text-slate-700">{km(vehicle.odometerKm)}</b>. De aici repornește numărătoarea.
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Odometru la efectuare (km)">
            <input
              type="number"
              value={serviceKm}
              onChange={(e) => setServiceKm(e.target.value)}
              placeholder={vehicle.odometerKm != null ? String(Math.round(vehicle.odometerKm)) : "km"}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              value={serviceAt}
              onChange={(e) => setServiceAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Manoperă (lei)">
            <input
              type="number"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
          <Field label="Piese (lei)">
            <input
              type="number"
              value={partsCost}
              onChange={(e) => setPartsCost(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </Field>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Total service</span>
            <span className="font-bold text-slate-900">{lei(total)}</span>
          </div>
        )}
        <Field label="Notițe (opțional)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ex: schimbat și filtru, service Auto XYZ"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </Field>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Anulează
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {saving ? "Se salvează…" : "Confirmă"}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" role="dialog">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Wrench className="h-4 w-4 text-orange-500" /> {title}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}
