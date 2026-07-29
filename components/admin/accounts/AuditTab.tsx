"use client";

/**
 * Tabul „Jurnal” — cine ce a schimbat, în ce sistem, când și de la ce IP.
 *
 * E singurul tab fără operații de scriere, și rămâne așa intenționat: un jurnal
 * din care se pot șterge intrări nu mai e o dovadă. De aceea aici nu există
 * buton de ștergere, iar `Modal` e folosit doar ca să arate o intrare întreagă,
 * cu detaliile pe care coloana din tabel le-ar tăia.
 */

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  ListChecks,
  Package,
  Pencil,
  Power,
  PowerOff,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  apiFetch,
  type AccountsTabProps,
  type AuditEntry,
  type AuditListResponse,
} from "@/lib/accountsClient";
import {
  EmptyState,
  ErrorBanner,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SuccessBanner,
  TableSkeleton,
  formatDateTime,
} from "./shared";

const API = "/api/admin/accounts/audit";

type IconType = React.ComponentType<{ className?: string }>;

type ActionStyle = {
  label: string;
  icon: IconType;
  /** Cerc de iconiță + pastilă: aceeași culoare, ca acțiunea să se recunoască dintr-o privire. */
  chip: string;
  dot: string;
};

// Culorile poartă înțeles: verde = s-a adăugat acces, roșu = s-a pierdut,
// portocaliu = s-a atins poarta secțiunii. Cine derulează jurnalul trebuie să
// vadă ștergerile fără să citească fiecare rând.
const ACTIONS: Record<string, ActionStyle> = {
  create: {
    label: "Cont creat",
    icon: UserPlus,
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-100 text-emerald-700",
  },
  update: {
    label: "Date modificate",
    icon: Pencil,
    chip: "bg-blue-50 text-blue-700",
    dot: "bg-blue-100 text-blue-700",
  },
  delete: {
    label: "Cont șters",
    icon: Trash2,
    chip: "bg-red-50 text-red-700",
    dot: "bg-red-100 text-red-700",
  },
  password: {
    label: "Parolă / PIN schimbat",
    icon: KeyRound,
    chip: "bg-amber-50 text-amber-800",
    dot: "bg-amber-100 text-amber-800",
  },
  permissions: {
    label: "Permisiuni schimbate",
    icon: ListChecks,
    chip: "bg-purple-50 text-purple-700",
    dot: "bg-purple-100 text-purple-700",
  },
  activate: {
    label: "Cont activat",
    icon: Power,
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-100 text-emerald-700",
  },
  deactivate: {
    label: "Cont dezactivat",
    icon: PowerOff,
    chip: "bg-slate-100 text-slate-700",
    dot: "bg-slate-200 text-slate-700",
  },
  gate_pin: {
    label: "PIN-ul secțiunii schimbat",
    icon: ShieldCheck,
    chip: "bg-orange-50 text-orange-700",
    dot: "bg-orange-100 text-orange-700",
  },
  unlock_fail: {
    label: "Deblocare eșuată",
    icon: ShieldX,
    chip: "bg-red-50 text-red-700",
    dot: "bg-red-100 text-red-700",
  },
};

/** Acțiune necunoscută (adăugată pe server mai târziu) — se arată ca atare, nu se ascunde. */
function actionStyle(action: string): ActionStyle {
  return (
    ACTIONS[action] ?? {
      label: action,
      icon: ScrollText,
      chip: "bg-slate-100 text-slate-700",
      dot: "bg-slate-200 text-slate-700",
    }
  );
}

const SYSTEMS: { key: string; label: string; icon: IconType }[] = [
  { key: "", label: "Toate", icon: ScrollText },
  { key: "davo", label: "davo.md", icon: ShieldCheck },
  { key: "rezervari", label: "Operatori", icon: Users },
  { key: "colete", label: "Colete", icon: Package },
  { key: "gate", label: "Poarta secțiunii", icon: KeyRound },
];

const SYSTEM_LABELS: Record<string, string> = {
  davo: "davo.md",
  rezervari: "rezervari",
  colete: "colete",
  gate: "poarta secțiunii",
};

const SYSTEM_CHIPS: Record<string, string> = {
  davo: "bg-slate-100 text-slate-700",
  rezervari: "bg-blue-50 text-blue-700",
  colete: "bg-purple-50 text-purple-700",
  gate: "bg-orange-50 text-orange-700",
};

// Cheile scrise de rutele API. Traduse aici, o singură dată, ca detaliile să se
// citească fără să știi cum arată corpul cererii care le-a produs.
const DETAIL_LABELS: Record<string, string> = {
  changed: "Câmpuri modificate",
  campuri: "Câmpuri modificate",
  name: "Nume",
  numeNou: "Nume nou",
  role: "Rol",
  rol: "Rol",
  active: "Activ",
  activ: "Activ",
  permissions: "Permisiuni",
  permisiuni: "Permisiuni",
  interval: "Interval numere",
  pinSchimbat: "PIN schimbat",
  context: "Context",
};

function detailValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "da" : "nu";
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((item) => detailValue(item)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Detaliile sunt JSON scurt, dar `audit()` acceptă și text simplu — deci
 * parsarea poate eșua legitim și atunci se arată textul brut.
 */
function parseDetails(details: string | null): { label: string; value: string }[] | string | null {
  if (!details) return null;
  try {
    const parsed: unknown = JSON.parse(details);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
        label: DETAIL_LABELS[key] ?? key,
        value: detailValue(value),
      }));
    }
    return detailValue(parsed);
  } catch {
    return details;
  }
}

/** Rezumat pe un rând, pentru coloana din tabel. */
function detailsSummary(details: string | null): string {
  const parsed = parseDetails(details);
  if (parsed === null) return "";
  if (typeof parsed === "string") return parsed;
  return parsed.map((item) => `${item.label}: ${item.value}`).join(" · ");
}

const RELATIVE_STEPS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 2592000, divisor: 86400, unit: "day" },
];

const relativeFmt = new Intl.RelativeTimeFormat("ro-RO", { numeric: "auto" });

/** „acum 5 minute” lângă data exactă: jurnalul se citește mai ales pentru „ce s-a întâmplat adineauri”. */
function formatRelative(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const seconds = (time - Date.now()) / 1000;
  const magnitude = Math.abs(seconds);
  for (const step of RELATIVE_STEPS) {
    if (magnitude < step.limit) {
      return relativeFmt.format(Math.round(seconds / step.divisor), step.unit);
    }
  }
  return "";
}

function ActionChip({ action }: { action: string }) {
  const style = actionStyle(action);
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.chip}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {style.label}
    </span>
  );
}

function SystemChip({ system }: { system: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        SYSTEM_CHIPS[system] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {SYSTEM_LABELS[system] ?? system}
    </span>
  );
}

// ───────────────────────────── Tabul ─────────────────────────────

export default function AuditTab({ token, onLocked }: AccountsTabProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [limit, setLimit] = useState(0);
  const [system, setSystem] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [opened, setOpened] = useState<AuditEntry | null>(null);

  // Indicatoarele de încărcare le pornesc apelanții, nu `load`: așa efectul de
  // mai jos rămâne o simplă sincronizare, fără randări în cascadă.
  const load = useCallback(
    async (filter: string, announce = false) => {
      const path = filter ? `${API}?system=${encodeURIComponent(filter)}` : API;
      const result = await apiFetch<AuditListResponse>(path, undefined, token);

      setLoading(false);
      setRefreshing(false);

      if (!result.ok) {
        if (result.locked) {
          onLocked();
          return;
        }
        // Eroarea rămâne în tab, lângă filtrul care a produs-o: un banner în
        // capul paginii ar părea că privește toată secțiunea.
        setError(result.error);
        return;
      }

      setError("");
      setEntries(result.data.entries);
      setLimit(result.data.limit);
      if (announce) {
        // Jurnalul poate arăta identic după reîmprospătare (nimic nou); fără
        // confirmarea asta, butonul ar părea că n-a făcut nimic.
        setNotice(
          `Jurnal actualizat — ${result.data.entries.length} ${
            result.data.entries.length === 1 ? "intrare afișată" : "intrări afișate"
          }.`,
        );
      }
    },
    [token, onLocked],
  );

  useEffect(() => {
    void load(system);
  }, [load, system]);

  function selectSystem(next: string) {
    if (next === system) return;
    setSystem(next);
    setLoading(true);
    setNotice("");
  }

  function refresh() {
    setRefreshing(true);
    void load(system, true);
  }

  function retry() {
    setLoading(true);
    setError("");
    void load(system);
  }

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openedDetails = opened ? parseDetails(opened.details) : null;

  return (
    <div>
      <SuccessBanner message={notice} onDismiss={() => setNotice("")} />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          {SYSTEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === system;
            return (
              <button
                key={item.key || "all"}
                type="button"
                onClick={() => selectSystem(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-orange-500" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </div>
        <SecondaryButton
          icon={RefreshCw}
          loading={refreshing}
          className="ml-auto"
          onClick={refresh}
        >
          Reîmprospătează
        </SecondaryButton>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : error ? (
        <div>
          <ErrorBanner message={error} />
          <PrimaryButton icon={RefreshCw} onClick={retry}>
            Încearcă din nou
          </PrimaryButton>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={system ? "Nicio intrare pentru acest sistem" : "Jurnalul e gol"}
          description={
            system
              ? "Schimbă filtrul sau alege „Toate” ca să vezi restul intrărilor."
              : "Aici apar automat toate schimbările de conturi și permisiuni făcute din acest panou."
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
                    <th className="px-5 py-3 text-left">Când</th>
                    <th className="px-5 py-3 text-left">Cine</th>
                    <th className="px-5 py-3 text-left">Acțiune</th>
                    <th className="px-5 py-3 text-left">Sistem</th>
                    <th className="px-5 py-3 text-left">Asupra cui</th>
                    <th className="px-5 py-3 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => {
                    const summary = detailsSummary(entry.details);
                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setOpened(entry)}
                        className="cursor-pointer align-top hover:bg-slate-50"
                        title="Vezi intrarea întreagă"
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="text-slate-800">{formatDateTime(entry.createdAt)}</div>
                          <div className="text-xs text-slate-400">
                            {formatRelative(entry.createdAt)}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{entry.actorEmail}</td>
                        <td className="px-5 py-3">
                          <ActionChip action={entry.action} />
                        </td>
                        <td className="px-5 py-3">
                          <SystemChip system={entry.system} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-900">{entry.targetName}</div>
                          {summary && (
                            <div className="max-w-[340px] truncate text-xs text-slate-500">
                              {summary}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                          {entry.ip ?? "—"}
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
            {entries.map((entry) => {
              const style = actionStyle(entry.action);
              const Icon = style.icon;
              const summary = detailsSummary(entry.details);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setOpened(entry)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.dot}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{style.label}</span>
                        <SystemChip system={entry.system} />
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-700">{entry.targetName}</div>
                      {summary && (
                        <div className="mt-0.5 truncate text-xs text-slate-500">{summary}</div>
                      )}
                      <div className="mt-2 text-xs text-slate-400">
                        {entry.actorEmail} · {formatDateTime(entry.createdAt)}
                        {entry.ip ? ` · ${entry.ip}` : ""}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            {entries.length} {entries.length === 1 ? "intrare" : "intrări"}
            {limit > 0 && entries.length >= limit
              ? ` — se afișează doar ultimele ${limit}, cele mai vechi rămân doar în baza de date.`
              : "."}
          </p>
        </>
      )}

      {opened && (
        <Modal
          title="Intrare din jurnal"
          description={formatDateTime(opened.createdAt)}
          size="sm"
          onClose={() => setOpened(null)}
          footer={<SecondaryButton onClick={() => setOpened(null)}>Închide</SecondaryButton>}
        >
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <ActionChip action={opened.action} />
              <SystemChip system={opened.system} />
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cine
                </dt>
                <dd className="mt-0.5 break-all text-slate-800">{opened.actorEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Asupra cui
                </dt>
                <dd className="mt-0.5 break-all text-slate-800">{opened.targetName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  IP
                </dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-700">{opened.ip ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Identificator țintă
                </dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-slate-500">
                  {opened.targetId ?? "—"}
                </dd>
              </div>
            </dl>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Detalii
              </div>
              {openedDetails === null ? (
                <p className="mt-1 text-slate-500">Fără detalii suplimentare.</p>
              ) : typeof openedDetails === "string" ? (
                <p className="mt-1 break-words text-slate-800">{openedDetails}</p>
              ) : (
                <ul className="mt-1 space-y-1 rounded-xl bg-slate-50 px-4 py-3">
                  {openedDetails.map((item) => (
                    <li key={item.label} className="flex flex-wrap gap-1.5">
                      <span className="text-slate-500">{item.label}:</span>
                      <span className="break-all text-slate-800">{item.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
