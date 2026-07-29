"use client";

/**
 * Tabul „Șoferi colete” — conturile din aplicația colete (Supabase separat).
 *
 * Două lucruri îl fac diferit de celelalte taburi de conturi:
 *
 * 1. PIN-ul e credențialul întreg (la login nu se cere niciun nume), iar
 *    aplicația colete îl ține în clar. Panoul îl poate deci arăta și copia —
 *    fără asta, adminul care tocmai a creat un cont n-ar avea ce să comunice
 *    șoferului și ar fi nevoit să deschidă Supabase.
 * 2. Integrarea poate lipsi cu totul (fără variabilele de mediu). Nu e o
 *    defecțiune, e o funcție nepornită, deci în locul tabelului se explică ce
 *    lipsește și unde se pune — un banner roșu ar trimite pe cineva să caute o
 *    pană inexistentă.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Badge from "@/components/admin/Badge";
import {
  apiFetch,
  reportFailure,
  type AccountsTabProps,
  type ColeteDriver,
  type ColeteListResponse,
  type ColeteMutationResponse,
  type ColeteRole,
} from "@/lib/accountsClient";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  SuccessBanner,
  TableSkeleton,
  formatDateTime,
  inputCls,
} from "./shared";

const API = "/api/admin/accounts/colete";

// Aceleași expresii ca în `lib/coleteAdmin.ts` și ca în aplicația colete.
// Verificate și aici ca greșelile de tastare să se vadă înainte de o cerere
// dus-întors, nu ca înlocuitor al validării de pe server.
const USERNAME_RE = /^[a-z0-9_]{2,}$/;
const PIN_RE = /^\d{4,}$/;

const NECONFIGURAT_FALLBACK =
  "Baza colete nu e configurată — adaugă COLETE_SUPABASE_URL și COLETE_SUPABASE_SERVICE_KEY în variabilele de mediu";

type DriverForm = {
  username: string;
  pin: string;
  role: ColeteRole;
  // Text, nu număr: un `input[type=number]` golit dă `""`, iar un `0` inventat
  // de noi ar trece drept interval valid.
  rangeStart: string;
  rangeEnd: string;
  active: boolean;
};

function emptyForm(): DriverForm {
  return { username: "", pin: "", role: "driver", rangeStart: "", rangeEnd: "", active: true };
}

function formFrom(driver: ColeteDriver): DriverForm {
  return {
    username: driver.username,
    // Gol intenționat: la editare PIN-ul se schimbă doar dacă e completat.
    pin: "",
    role: driver.role,
    rangeStart: String(driver.rangeStart),
    rangeEnd: String(driver.rangeEnd),
    active: driver.active,
  };
}

/** Primul motiv pentru care formularul nu poate fi trimis, sau „” dacă e în regulă. */
function validate(form: DriverForm, isEdit: boolean): string {
  if (!USERNAME_RE.test(form.username.trim().toLowerCase())) {
    return "Numele de utilizator poate conține doar litere mici, cifre și _ și are minimum 2 caractere";
  }
  const pin = form.pin.trim();
  if (!isEdit && !PIN_RE.test(pin)) return "PIN-ul trebuie să conțină minimum 4 cifre";
  if (isEdit && pin !== "" && !PIN_RE.test(pin)) {
    return "PIN-ul nou trebuie să conțină minimum 4 cifre — lasă câmpul gol ca să-l păstrezi pe cel actual";
  }

  const start = Number(form.rangeStart);
  const end = Number(form.rangeEnd);
  if (
    form.rangeStart.trim() === "" ||
    form.rangeEnd.trim() === "" ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0
  ) {
    return "Intervalul de numere trebuie să fie format din două numere întregi pozitive";
  }
  if (start >= end) return "Începutul intervalului trebuie să fie mai mic decât sfârșitul";
  return "";
}

/** Câți alți admini rămân activi dacă șoferul dat pierde rolul sau contul. */
function otherActiveAdmins(drivers: ColeteDriver[], id: string): number {
  return drivers.filter((d) => d.id !== id && d.role === "admin" && d.active).length;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Clipboard-ul modern cere context securizat; mai jos e varianta veche.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

// ───────────────────────────── PIN-ul din tabel ─────────────────────────────

/**
 * PIN-ul stă ascuns implicit: tabelul se deschide des cu cineva lângă ecran,
 * iar PIN-ul e singurul lucru care ține un cont de șofer.
 */
function PinCell({
  pin,
  revealed,
  onToggle,
}: {
  pin: string;
  revealed: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const ok = await copyToClipboard(pin);
    setCopied(ok);
    setCopyFailed(!ok);
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={`font-mono text-sm ${revealed ? "text-slate-900" : "tracking-widest text-slate-400"}`}
      >
        {revealed ? pin : "•".repeat(Math.max(4, pin.length))}
      </span>
      <IconButton
        icon={revealed ? EyeOff : Eye}
        label={revealed ? "Ascunde PIN-ul" : "Arată PIN-ul"}
        onClick={onToggle}
      />
      <IconButton
        icon={copied ? Check : Copy}
        label={copied ? "PIN copiat" : "Copiază PIN-ul"}
        onClick={() => void copy()}
      />
      {copyFailed && (
        <span className="text-xs text-amber-700">Copiază manual (browserul nu a permis)</span>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: ColeteRole }) {
  return (
    <Badge variant={role === "admin" ? "orange" : "slate"}>
      {role === "admin" ? "Admin" : "Șofer"}
    </Badge>
  );
}

// ───────────────────────── Integrarea neconfigurată ─────────────────────────

function NotConfigured({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">
            Legătura cu aplicația colete nu e configurată
          </h3>
          <p className="mt-1 text-sm text-slate-600">{message}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Variabilele necesare
        </div>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          <li>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-800">
              COLETE_SUPABASE_URL
            </code>{" "}
            — adresa proiectului Supabase al aplicației colete (Supabase → Project Settings →
            API → Project URL).
          </li>
          <li>
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-800">
              COLETE_SUPABASE_SERVICE_KEY
            </code>{" "}
            — cheia <span className="font-mono text-xs">service_role</span> din același loc.
            Ocolește regulile de acces, deci stă doar pe server; nu o pune într-o variabilă
            care începe cu <span className="font-mono text-xs">NEXT_PUBLIC_</span>.
          </li>
        </ul>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Local:</span> în fișierul{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code>{" "}
          din rădăcina proiectului, apoi repornește serverul de dezvoltare.
        </p>
        <p>
          <span className="font-semibold text-slate-800">În producție:</span> Vercel → proiectul
          davo → Settings → Environment Variables, apoi un redeploy ca variabilele să ajungă în
          rulare.
        </p>
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Până atunci restul secțiunii funcționează normal: adminii davo.md și operatorii
        rezervari stau în baza proprie și nu depind de colete.
      </p>
    </div>
  );
}

// ───────────────────────────── Tabul ─────────────────────────────

export default function ColeteTab({ token, onLocked, onError, onSuccess }: AccountsTabProps) {
  const [drivers, setDrivers] = useState<ColeteDriver[]>([]);
  const [configured, setConfigured] = useState(true);
  const [configMessage, setConfigMessage] = useState(NECONFIGURAT_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState<ColeteDriver | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirming, setConfirming] = useState<ColeteDriver | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Ce PIN-uri sunt dezvăluite acum. Se golește la fiecare reîncărcare: dacă
  // un cont e șters și altul îi ia locul, id-ul rămas în listă ar dezvălui
  // PIN-ul greșit.
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState("");

  // Indicatoarele de încărcare le pornesc apelanții (butonul de reîmprospătare,
  // cel de reîncercare), nu `load`: reîncărcarea de după o salvare trebuie să
  // lase tabelul la locul lui, nu să-l înlocuiască o clipă cu o schiță.
  const load = useCallback(async () => {
    const result = await apiFetch<ColeteListResponse>(API, undefined, token);

    setLoading(false);
    setRefreshing(false);

    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      setLoadError(result.error);
      return;
    }

    setLoadError("");
    setConfigured(result.data.configured);
    setConfigMessage(result.data.message || NECONFIGURAT_FALLBACK);
    setDrivers(result.data.drivers ?? []);
  }, [token, onLocked]);

  useEffect(() => {
    void load();
  }, [load]);

  function refresh() {
    setRefreshing(true);
    void load();
  }

  function retry() {
    setLoading(true);
    setLoadError("");
    void load();
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setForm(emptyForm());
    setFormError("");
  }

  function openEdit(driver: ColeteDriver) {
    setCreating(false);
    setEditing(driver);
    setForm(formFrom(driver));
    setFormError("");
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
    setFormError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const isEdit = editing !== null;
    const problem = validate(form, isEdit);
    if (problem) {
      setFormError(problem);
      return;
    }

    const payload = {
      username: form.username.trim().toLowerCase(),
      pin: form.pin.trim(),
      role: form.role,
      rangeStart: Number(form.rangeStart),
      rangeEnd: Number(form.rangeEnd),
      ...(isEdit ? { active: form.active } : {}),
    };

    setSaving(true);
    setFormError("");

    if (isEdit && editing) {
      const result = await apiFetch<Record<string, unknown>>(
        `${API}/${encodeURIComponent(editing.id)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        token,
      );
      setSaving(false);
      if (!result.ok) {
        if (result.locked) {
          onLocked();
          return;
        }
        // Eroarea rămâne în modal: formularul completat nu se pierde, iar
        // mesajul stă lângă câmpul care trebuie corectat.
        setFormError(result.error);
        return;
      }
      closeModal();
      onSuccess(`Contul „${payload.username}” a fost salvat`);
      void load();
      return;
    }

    const result = await apiFetch<ColeteMutationResponse>(
      API,
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
    setSaving(false);
    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      setFormError(result.error);
      return;
    }

    const created = result.data.driver;
    closeModal();
    // PIN-ul contului nou se arată din start: e singurul moment în care adminul
    // chiar are nevoie de el, ca să-l dea șoferului.
    setRevealed((current) => new Set(current).add(created.id));
    setNotice(
      `Contul „${created.username}” a fost creat. Comunică-i șoferului PIN-ul ${created.pin} — cu el se autentifică în aplicația colete.`,
    );
    onSuccess(`Contul „${created.username}” a fost creat`);
    void load();
  }

  async function toggleActive(driver: ColeteDriver) {
    setBusyId(driver.id);
    const result = await apiFetch<Record<string, unknown>>(
      `${API}/${encodeURIComponent(driver.id)}`,
      { method: "PATCH", body: JSON.stringify({ active: !driver.active }) },
      token,
    );
    setBusyId(null);
    if (!result.ok) {
      reportFailure(result, { onLocked, onError });
      return;
    }
    onSuccess(
      driver.active
        ? `Contul „${driver.username}” a fost dezactivat — PIN-ul nu mai funcționează`
        : `Contul „${driver.username}” a fost activat`,
    );
    void load();
  }

  async function remove() {
    if (!confirming) return;
    const target = confirming;
    setDeleting(true);
    const result = await apiFetch<Record<string, unknown>>(
      `${API}/${encodeURIComponent(target.id)}`,
      { method: "DELETE" },
      token,
    );
    setDeleting(false);
    setConfirming(null);
    if (!result.ok) {
      reportFailure(result, { onLocked, onError });
      return;
    }
    onSuccess(`Contul „${target.username}” a fost șters`);
    void load();
  }

  function toggleReveal(id: string) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Ștergerea: motivele pentru care serverul ar refuza, arătate înainte ──
  const blockedByParcels = Boolean(confirming && confirming.parcels > 0);
  const blockedByLastAdmin = Boolean(
    confirming &&
      confirming.role === "admin" &&
      confirming.active &&
      otherActiveAdmins(drivers, confirming.id) === 0,
  );

  if (loading) {
    return (
      <div>
        <div className="mb-4 h-9 w-40 animate-pulse rounded-lg bg-slate-100" />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <ErrorBanner message={loadError} />
        <PrimaryButton icon={RefreshCw} onClick={retry}>
          Încearcă din nou
        </PrimaryButton>
      </div>
    );
  }

  if (!configured) return <NotConfigured message={configMessage} />;

  return (
    <div>
      <SuccessBanner message={notice} onDismiss={() => setNotice("")} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PrimaryButton icon={Plus} onClick={openCreate}>
          Adaugă șofer
        </PrimaryButton>
        <SecondaryButton icon={RefreshCw} loading={refreshing} onClick={refresh}>
          Reîmprospătează
        </SecondaryButton>
        <span className="ml-auto text-xs text-slate-500">
          {drivers.length} {drivers.length === 1 ? "cont" : "conturi"} în aplicația colete
        </span>
      </div>

      {drivers.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Niciun cont de șofer încă"
          description="Conturile create aici apar imediat în aplicația colete. Șoferul se autentifică doar cu PIN-ul."
          action={
            <PrimaryButton icon={Plus} onClick={openCreate}>
              Adaugă primul șofer
            </PrimaryButton>
          }
        />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Șofer</th>
                    <th className="px-5 py-3 text-left">PIN</th>
                    <th className="px-5 py-3 text-left">Rol</th>
                    <th className="px-5 py-3 text-left">Interval numere</th>
                    <th className="px-5 py-3 text-left">Colete active</th>
                    <th className="px-5 py-3 text-left">Stare</th>
                    <th className="px-5 py-3 text-left">Ultima autentificare</th>
                    <th className="px-5 py-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drivers.map((driver) => {
                    const lastAdmin =
                      driver.role === "admin" &&
                      driver.active &&
                      otherActiveAdmins(drivers, driver.id) === 0;
                    return (
                      <tr key={driver.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900">{driver.username}</div>
                          <div className="text-xs text-slate-500">
                            {driver.username}@colete.local
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <PinCell
                            pin={driver.pin}
                            revealed={revealed.has(driver.id)}
                            onToggle={() => toggleReveal(driver.id)}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <RoleBadge role={driver.role} />
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-700">
                          {driver.rangeStart} – {driver.rangeEnd}
                        </td>
                        <td className="px-5 py-3 text-slate-700">{driver.parcels}</td>
                        <td className="px-5 py-3">
                          <StatusBadge active={driver.active} />
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatDateTime(driver.lastSignInAt)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <IconButton
                              icon={Pencil}
                              label="Editează contul"
                              onClick={() => openEdit(driver)}
                              disabled={busyId === driver.id}
                            />
                            <IconButton
                              icon={driver.active ? PowerOff : Power}
                              label={
                                lastAdmin
                                  ? "Ultimul admin activ nu poate fi dezactivat"
                                  : driver.active
                                    ? "Dezactivează contul"
                                    : "Activează contul"
                              }
                              onClick={() => void toggleActive(driver)}
                              disabled={busyId === driver.id || lastAdmin}
                            />
                            <IconButton
                              icon={Trash2}
                              label="Șterge contul"
                              tone="danger"
                              onClick={() => setConfirming(driver)}
                              disabled={busyId === driver.id}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil */}
          <div className="space-y-3 md:hidden">
            {drivers.map((driver) => {
              const lastAdmin =
                driver.role === "admin" &&
                driver.active &&
                otherActiveAdmins(drivers, driver.id) === 0;
              return (
                <div
                  key={driver.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{driver.username}</div>
                      <div className="truncate text-xs text-slate-500">
                        {driver.username}@colete.local
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge active={driver.active} />
                      <RoleBadge role={driver.role} />
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      PIN
                    </div>
                    <div className="mt-1">
                      <PinCell
                        pin={driver.pin}
                        revealed={revealed.has(driver.id)}
                        onToggle={() => toggleReveal(driver.id)}
                      />
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Interval numere</dt>
                      <dd className="font-mono text-xs text-slate-800">
                        {driver.rangeStart} – {driver.rangeEnd}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Colete active</dt>
                      <dd className="text-slate-800">{driver.parcels}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-slate-500">Ultima autentificare</dt>
                      <dd className="text-slate-800">{formatDateTime(driver.lastSignInAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <SecondaryButton
                      icon={Pencil}
                      onClick={() => openEdit(driver)}
                      disabled={busyId === driver.id}
                    >
                      Editează
                    </SecondaryButton>
                    <SecondaryButton
                      icon={driver.active ? PowerOff : Power}
                      onClick={() => void toggleActive(driver)}
                      disabled={busyId === driver.id || lastAdmin}
                      title={lastAdmin ? "Ultimul admin activ nu poate fi dezactivat" : undefined}
                    >
                      {driver.active ? "Dezactivează" : "Activează"}
                    </SecondaryButton>
                    <SecondaryButton
                      icon={Trash2}
                      className="text-red-600"
                      onClick={() => setConfirming(driver)}
                      disabled={busyId === driver.id}
                    >
                      Șterge
                    </SecondaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(creating || editing) && (
        <Modal
          title={editing ? `Editează contul „${editing.username}”` : "Șofer nou în colete"
          }
          description={
            editing
              ? "Modificările ajung imediat în aplicația colete."
              : "Contul se creează direct în aplicația colete: autentificare + profil, într-un singur pas."
          }
          onClose={saving ? () => {} : closeModal}
          footer={
            <>
              <SecondaryButton onClick={closeModal} disabled={saving}>
                Anulează
              </SecondaryButton>
              <PrimaryButton type="submit" form="colete-form" loading={saving}>
                {editing ? "Salvează" : "Creează contul"}
              </PrimaryButton>
            </>
          }
        >
          <form id="colete-form" className="grid gap-4" onSubmit={submit}>
            <ErrorBanner message={formError} onDismiss={() => setFormError("")} />

            <Field
              label="Nume de utilizator"
              hint="Doar litere mici, cifre și _. Din el se construiește emailul intern de autentificare."
            >
              <input
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value.toLowerCase() })
                }
                placeholder="ion_popescu"
                autoComplete="off"
                className={inputCls}
              />
            </Field>

            <Field
              label={editing ? "PIN nou" : "PIN"}
              hint={
                editing
                  ? "Lasă câmpul gol ca să păstrezi PIN-ul actual. Minimum 4 cifre, unic între toți șoferii."
                  : "Minimum 4 cifre. E singurul credențial al șoferului și trebuie să fie unic."
              }
            >
              <input
                value={form.pin}
                inputMode="numeric"
                autoComplete="off"
                placeholder={editing ? "Neschimbat" : "1234"}
                onChange={(event) =>
                  setForm({ ...form, pin: event.target.value.replace(/\D/g, "") })
                }
                className={`${inputCls} font-mono tracking-widest`}
              />
            </Field>

            <Field
              label="Rol"
              hint="Adminii pot administra coletele tuturor; șoferii doar pe ale lor."
            >
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as ColeteRole })}
                className={inputCls}
              >
                <option value="driver">Șofer</option>
                <option value="admin">Admin</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Început interval">
                <input
                  value={form.rangeStart}
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm({ ...form, rangeStart: event.target.value.replace(/\D/g, "") })
                  }
                  placeholder="1000"
                  className={inputCls}
                />
              </Field>
              <Field label="Sfârșit interval">
                <input
                  value={form.rangeEnd}
                  inputMode="numeric"
                  onChange={(event) =>
                    setForm({ ...form, rangeEnd: event.target.value.replace(/\D/g, "") })
                  }
                  placeholder="1999"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="-mt-2 text-xs text-slate-500">
              Numerele de colete pe care le poate emite contul. Începutul trebuie să fie strict
              mai mic decât sfârșitul, iar intervalele a doi șoferi nu ar trebui să se suprapună.
            </p>

            {editing && (
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                />
                Cont activ (dezactivat = PIN-ul nu mai funcționează, istoricul rămâne)
              </label>
            )}
          </form>
        </Modal>
      )}

      {confirming && (blockedByParcels || blockedByLastAdmin) && (
        <Modal
          title="Contul nu poate fi șters"
          size="sm"
          onClose={() => setConfirming(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setConfirming(null)}>Închide</SecondaryButton>
              {blockedByParcels && !blockedByLastAdmin && (
                <PrimaryButton
                  icon={PowerOff}
                  loading={busyId === confirming.id}
                  onClick={() => {
                    const target = confirming;
                    setConfirming(null);
                    void toggleActive(target);
                  }}
                >
                  Dezactivează în schimb
                </PrimaryButton>
              )}
            </>
          }
        >
          {blockedByParcels && (
            <p className="text-sm text-slate-700">
              Șoferul „{confirming.username}” are {confirming.parcels}{" "}
              {confirming.parcels === 1 ? "colet ne-arhivat" : "colete ne-arhivate"} atribuite.
              Ștergerea contului ar rupe legătura cu ele și coletele ar rămâne fără destinatar în
              aplicație.
            </p>
          )}
          {blockedByLastAdmin && (
            <p className={`text-sm text-slate-700 ${blockedByParcels ? "mt-3" : ""}`}>
              În plus, „{confirming.username}” e ultimul admin activ din colete. Promovează întâi
              alt șofer la rol de admin — altfel aplicația rămâne fără nimeni care să o
              administreze.
            </p>
          )}
          {blockedByParcels && !blockedByLastAdmin && (
            <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="font-semibold">Alternativa:</span> dezactivează contul. PIN-ul nu
              mai funcționează și șoferul nu se mai poate autentifica, dar coletele lui și tot
              istoricul rămân intacte. Contul poate fi reactivat oricând.
            </div>
          )}
        </Modal>
      )}

      {confirming && !blockedByParcels && !blockedByLastAdmin && (
        <ConfirmDialog
          title={`Ștergi contul „${confirming.username}”?`}
          message="Contul dispare definitiv din aplicația colete. Nu există pas de anulare."
          consequences={[
            `Autentificarea ${confirming.username}@colete.local se șterge din Supabase.`,
            "PIN-ul actual nu mai funcționează pentru nimeni.",
            `Profilul (rol, interval ${confirming.rangeStart}–${confirming.rangeEnd}) dispare odată cu el.`,
            "Dacă vrei doar să-i tai accesul, dezactivează contul în loc să-l ștergi.",
          ]}
          loading={deleting}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
