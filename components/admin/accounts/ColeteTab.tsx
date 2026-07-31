"use client";

/**
 * Tabul „Șoferi colete” — conturile din aplicația colete (Supabase separat).
 *
 * Trei lucruri îl fac diferit de celelalte taburi de conturi:
 *
 * 1. PIN-ul e credențialul întreg (la login nu se cere niciun nume), iar
 *    aplicația colete îl ține în clar. Panoul îl poate deci arăta și copia —
 *    fără asta, adminul care tocmai a creat un cont n-ar avea ce să comunice
 *    șoferului și ar fi nevoit să deschidă Supabase.
 * 2. Numerotarea coletelor nu e o proprietate a contului, ci a RUTEI: fiecare
 *    pereche origine → destinație are propriul interval, într-un rând separat
 *    din `driver_route_ranges`. De asta intervalele se editează într-un ecran
 *    propriu, rând cu rând, nu ca două câmpuri în formularul contului.
 * 3. Integrarea poate lipsi cu totul (fără variabilele de mediu). Nu e o
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
  Route,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Badge from "@/components/admin/Badge";
import {
  apiFetch,
  countryLabel,
  reportFailure,
  COLETE_COUNTRIES,
  type AccountsTabProps,
  type ColeteDriver,
  type ColeteListResponse,
  type ColeteMutationResponse,
  type ColeteRole,
  type ColeteRouteRange,
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

// ───────────────────────────── Formularul contului ─────────────────────────────

type DriverForm = {
  username: string;
  pin: string;
  role: ColeteRole;
  excludedDestinations: string[];
  /** `null` = fără acces la Colectări. Lista (chiar goală) = acces limitat la ea. */
  allowedCollectionCountries: string[] | null;
  sharedPickupCounter: boolean;
  active: boolean;
};

/** Un rând de interval în formular. Textele rămân text: un câmp golit dă `""`. */
type RangeForm = {
  origin: string;
  destination: string;
  rangeStart: string;
  rangeEnd: string;
};

function emptyForm(): DriverForm {
  return {
    username: "",
    pin: "",
    role: "driver",
    excludedDestinations: [],
    // Contul nou pornește fără Colectări — e starea implicită și a majorității
    // conturilor reale; accesul se dă explicit.
    allowedCollectionCountries: null,
    sharedPickupCounter: false,
    active: true,
  };
}

function emptyRange(): RangeForm {
  return { origin: "MD", destination: "", rangeStart: "", rangeEnd: "" };
}

function formFrom(driver: ColeteDriver): DriverForm {
  return {
    username: driver.username,
    // Gol intenționat: la editare PIN-ul se schimbă doar dacă e completat.
    pin: "",
    role: driver.role,
    excludedDestinations: driver.excludedDestinations,
    allowedCollectionCountries: driver.allowedCollectionCountries,
    sharedPickupCounter: driver.sharedPickupCounter,
    active: driver.active,
  };
}

function rangeFormFrom(range: ColeteRouteRange): RangeForm {
  return {
    origin: range.origin,
    destination: range.destination,
    rangeStart: String(range.rangeStart),
    rangeEnd: String(range.rangeEnd),
  };
}

/** Primul motiv pentru care contul nu poate fi salvat, sau „” dacă e în regulă. */
function validate(form: DriverForm, isEdit: boolean): string {
  if (!USERNAME_RE.test(form.username.trim().toLowerCase())) {
    return "Numele de utilizator poate conține doar litere mici, cifre și _ și are minimum 2 caractere";
  }
  const pin = form.pin.trim();
  if (!isEdit && !PIN_RE.test(pin)) return "PIN-ul trebuie să conțină minimum 4 cifre";
  if (isEdit && pin !== "" && !PIN_RE.test(pin)) {
    return "PIN-ul nou trebuie să conțină minimum 4 cifre — lasă câmpul gol ca să-l păstrezi pe cel actual";
  }
  return "";
}

/** Primul motiv pentru care un interval nu poate fi salvat, sau „” dacă e în regulă. */
function validateRange(range: RangeForm): string {
  if (!range.origin) return "Alege țara de origine";
  if (!range.destination) return "Alege țara de destinație";
  if (range.origin === range.destination) return "Ruta trebuie să lege două țări diferite";

  const start = Number(range.rangeStart);
  const end = Number(range.rangeEnd);
  if (
    range.rangeStart.trim() === "" ||
    range.rangeEnd.trim() === "" ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0
  ) {
    return "Intervalul trebuie să fie format din două numere întregi pozitive";
  }
  if (start > end) return "Începutul intervalului nu poate fi mai mare decât sfârșitul";
  return "";
}

function rangePayload(range: RangeForm) {
  return {
    origin: range.origin,
    destination: range.destination,
    rangeStart: Number(range.rangeStart),
    rangeEnd: Number(range.rangeEnd),
  };
}

/** Câți alți admini rămân activi dacă șoferul dat pierde rolul sau contul. */
function otherActiveAdmins(drivers: ColeteDriver[], id: string): number {
  return drivers.filter((d) => d.id !== id && d.role === "admin" && d.active).length;
}

/**
 * Perechile de intervale ale aceluiași cont care se suprapun.
 *
 * Copie a lui `overlappingRoutePairs` din `lib/coleteAdmin.ts` — acela citește
 * cheia `service_role`, deci nu poate fi importat ca valoare într-un component
 * client. Regula trebuie să rămână identică în cele două locuri.
 *
 * NU e o eroare: contoarele sunt per rută, iar în baza reală majoritatea
 * conturilor folosesc dinadins aceleași numere pe rute diferite (prefixul din
 * numărul coletei le ține separate). Se arată doar ca avertisment, ca o
 * suprapunere nedorită să nu treacă neobservată.
 */
function overlaps(ranges: ColeteRouteRange[]): { a: ColeteRouteRange; b: ColeteRouteRange }[] {
  const pairs: { a: ColeteRouteRange; b: ColeteRouteRange }[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].rangeStart <= ranges[j].rangeEnd && ranges[j].rangeStart <= ranges[i].rangeEnd) {
        pairs.push({ a: ranges[i], b: ranges[j] });
      }
    }
  }
  return pairs;
}

function describeRoute(range: {
  origin: string;
  destination: string;
  rangeStart: number;
  rangeEnd: number;
}): string {
  return `${range.origin} → ${range.destination} (${range.rangeStart}–${range.rangeEnd})`;
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

/** Rutele contului, pe scurt. Peste trei rânduri, restul se numără. */
function RoutesCell({ ranges }: { ranges: ColeteRouteRange[] }) {
  if (ranges.length === 0) {
    return (
      <span className="text-xs text-amber-700">
        Nicio rută — contul nu poate emite numere de colet
      </span>
    );
  }
  const shown = ranges.slice(0, 3);
  return (
    <div className="space-y-0.5">
      {shown.map((range) => (
        <div key={range.id} className="font-mono text-xs text-slate-700">
          {range.origin}→{range.destination} {range.rangeStart}–{range.rangeEnd}
        </div>
      ))}
      {ranges.length > shown.length && (
        <div className="text-xs text-slate-500">+{ranges.length - shown.length} încă</div>
      )}
    </div>
  );
}

function CollectionsCell({ countries }: { countries: string[] | null }) {
  if (countries === null) return <Badge variant="slate">Fără acces</Badge>;
  if (countries.length === 0) {
    return <Badge variant="yellow">Nicio țară</Badge>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((code) => (
        <Badge key={code} variant="blue">
          {code}
        </Badge>
      ))}
    </div>
  );
}

// ─────────────────────── Selectoare de țări (formular) ───────────────────────

function CountryChecklist({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(code: string) {
    // Ordinea din catalog, nu ordinea bifării: lista salvată rămâne comparabilă
    // între conturi (și identică cu ce normalizează serverul).
    const next = value.includes(code)
      ? value.filter((c) => c !== code)
      : COLETE_COUNTRIES.filter((c) => c.code === code || value.includes(c.code)).map((c) => c.code);
    onChange(next);
  }

  return (
    <div className={`grid gap-1.5 sm:grid-cols-2 ${disabled ? "opacity-60" : ""}`}>
      {COLETE_COUNTRIES.map((country) => (
        <label
          key={country.code}
          className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${
            disabled ? "" : "cursor-pointer hover:bg-orange-50"
          }`}
        >
          <input
            type="checkbox"
            checked={value.includes(country.code)}
            disabled={disabled}
            onChange={() => toggle(country.code)}
            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
          />
          <span className="font-mono text-xs text-slate-500">{country.code}</span>
          {country.label}
        </label>
      ))}
    </div>
  );
}

/**
 * `allowed_collection_countries` are o stare pe care o listă de căsuțe n-o poate
 * exprima: `null` (fără acces la Colectări) e altceva decât o listă goală.
 * Aplicația colete deschide secțiunea doar când lista are cel puțin o țară, așa
 * că modul e o alegere separată, nu consecința debifării ultimei căsuțe.
 */
function CollectionsPicker({
  value,
  onChange,
}: {
  value: string[] | null;
  onChange: (next: string[] | null) => void;
}) {
  const enabled = value !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="space-y-2">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="colectari"
            checked={!enabled}
            onChange={() => onChange(null)}
            className="mt-0.5 h-4 w-4 border-slate-300 text-orange-500 focus:ring-orange-300"
          />
          <span>
            <span className="font-semibold">Fără acces la Colectări</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Secțiunea de colectări nu apare deloc în aplicație.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="colectari"
            checked={enabled}
            // Pornim de la o listă goală: adminul bifează explicit țările, ca să
            // nu dea din greșeală acces pe toate.
            onChange={() => onChange([])}
            className="mt-0.5 h-4 w-4 border-slate-300 text-orange-500 focus:ring-orange-300"
          />
          <span>
            <span className="font-semibold">Acces la Colectări, doar pe țările bifate</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Contul vede și poate prelua colectări numai din țările alese mai jos.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-3">
        <CountryChecklist
          value={value ?? []}
          onChange={(next) => onChange(next)}
          disabled={!enabled}
        />
      </div>

      {enabled && value.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Nicio țară bifată — în aplicație e la fel ca „fără acces”, fiindcă secțiunea Colectări se
          deschide doar când lista are cel puțin o țară.
        </p>
      )}
    </div>
  );
}

// ──────────────────────── Un rând de interval (formular) ────────────────────────

function RangeFields({
  value,
  onChange,
  disabled = false,
}: {
  value: RangeForm;
  onChange: (next: RangeForm) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <select
        aria-label="Țara de origine"
        value={value.origin}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, origin: event.target.value })}
        className={inputCls}
      >
        <option value="">Origine…</option>
        {COLETE_COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.code} — {country.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Țara de destinație"
        value={value.destination}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, destination: event.target.value })}
        className={inputCls}
      >
        <option value="">Destinație…</option>
        {COLETE_COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.code} — {country.label}
          </option>
        ))}
      </select>
      <input
        aria-label="Început interval"
        value={value.rangeStart}
        inputMode="numeric"
        disabled={disabled}
        placeholder="de la"
        onChange={(event) =>
          onChange({ ...value, rangeStart: event.target.value.replace(/\D/g, "") })
        }
        className={`${inputCls} font-mono`}
      />
      <input
        aria-label="Sfârșit interval"
        value={value.rangeEnd}
        inputMode="numeric"
        disabled={disabled}
        placeholder="până la"
        onChange={(event) => onChange({ ...value, rangeEnd: event.target.value.replace(/\D/g, "") })}
        className={`${inputCls} font-mono`}
      />
    </div>
  );
}

/** Avertismentul de suprapunere, comun ecranului de rute și formularului de creare. */
function OverlapNotice({ ranges }: { ranges: ColeteRouteRange[] }) {
  const pairs = overlaps(ranges);
  if (pairs.length === 0) return null;
  return (
    <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
      <span className="font-semibold">Intervale care se suprapun:</span>{" "}
      {pairs
        .slice(0, 4)
        .map((pair) => `${describeRoute(pair.a)} ↔ ${describeRoute(pair.b)}`)
        .join("; ")}
      {pairs.length > 4 && ` și încă ${pairs.length - 4}`}. Nu e neapărat o problemă: fiecare rută
      își ține contorul separat, iar prefixul din numărul coletei le deosebește. Verifică totuși
      dacă suprapunerea a fost intenționată.
    </div>
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
  // Intervalele contului NOU: până nu există un id de șofer, nu au unde fi
  // salvate, deci stau local și pleacă odată cu POST-ul de creare.
  const [newRanges, setNewRanges] = useState<RangeForm[]>([]);
  const [newRange, setNewRange] = useState<RangeForm>(emptyRange);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Ecranul de rute al unui cont EXISTENT. Ținem doar id-ul: rândul proaspăt se
  // ia din `drivers`, ca lista să se actualizeze singură după fiecare salvare.
  const [rangesFor, setRangesFor] = useState<string | null>(null);

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
    setNewRanges([]);
    setNewRange(emptyRange());
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

  // ── Intervalele contului nou, doar în memorie ──

  function addNewRange() {
    const problem = validateRange(newRange);
    if (problem) {
      setFormError(problem);
      return;
    }
    const duplicate = newRanges.some(
      (row) => row.origin === newRange.origin && row.destination === newRange.destination,
    );
    if (duplicate) {
      setFormError(
        `Ruta ${newRange.origin} → ${newRange.destination} e deja în listă — o rută are un singur interval.`,
      );
      return;
    }
    setNewRanges([...newRanges, newRange]);
    setNewRange(emptyRange());
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
      excludedDestinations: form.excludedDestinations,
      allowedCollectionCountries: form.allowedCollectionCountries,
      sharedPickupCounter: form.sharedPickupCounter,
      ...(isEdit ? { active: form.active } : { routeRanges: newRanges.map(rangePayload) }),
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
      `Contul „${created.username}” a fost creat. Comunică-i șoferului PIN-ul ${created.pin} — cu el se autentifică în aplicația colete.` +
        (created.routeRanges.length === 0
          ? " Contul nu are încă nicio rută cu interval de numere, deci nu poate emite colete — adaugă-i una din butonul „Rute”."
          : ""),
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

  const rangesDriver = rangesFor ? (drivers.find((d) => d.id === rangesFor) ?? null) : null;

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
                    <th className="px-5 py-3 text-left">Rute și numere</th>
                    <th className="px-5 py-3 text-left">Colectări</th>
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
                          {driver.excludedDestinations.length > 0 && (
                            <div className="mt-1 text-xs text-slate-500">
                              Nu vede: {driver.excludedDestinations.join(", ")}
                            </div>
                          )}
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
                          {driver.sharedPickupCounter && (
                            <div className="mt-1">
                              <Badge variant="purple">Contor comun</Badge>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <RoutesCell ranges={driver.routeRanges} />
                        </td>
                        <td className="px-5 py-3">
                          <CollectionsCell countries={driver.allowedCollectionCountries} />
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
                              icon={Route}
                              label="Rute și intervale de numere"
                              onClick={() => setRangesFor(driver.id)}
                              disabled={busyId === driver.id}
                            />
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
                      {driver.sharedPickupCounter && <Badge variant="purple">Contor comun</Badge>}
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
                    <div className="col-span-2">
                      <dt className="text-xs text-slate-500">Rute și numere</dt>
                      <dd className="mt-0.5">
                        <RoutesCell ranges={driver.routeRanges} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Colectări</dt>
                      <dd className="mt-0.5">
                        <CollectionsCell countries={driver.allowedCollectionCountries} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Colete active</dt>
                      <dd className="text-slate-800">{driver.parcels}</dd>
                    </div>
                    {driver.excludedDestinations.length > 0 && (
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-500">Destinații ascunse</dt>
                        <dd className="text-slate-800">
                          {driver.excludedDestinations.join(", ")}
                        </dd>
                      </div>
                    )}
                    <div className="col-span-2">
                      <dt className="text-xs text-slate-500">Ultima autentificare</dt>
                      <dd className="text-slate-800">{formatDateTime(driver.lastSignInAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <SecondaryButton
                      icon={Route}
                      onClick={() => setRangesFor(driver.id)}
                      disabled={busyId === driver.id}
                    >
                      Rute
                    </SecondaryButton>
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
          title={editing ? `Editează contul „${editing.username}”` : "Șofer nou în colete"}
          size="lg"
          description={
            editing
              ? "Modificările ajung imediat în aplicația colete. Rutele și intervalele de numere se schimbă din butonul „Rute”."
              : "Contul se creează direct în aplicația colete: autentificare + profil + rute, într-un singur pas."
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

            <Field
              label="Destinații ascunse"
              hint="Țările bifate dispar din aplicație pentru acest cont. Pe un admin, restrânge și lista de șoferi și de colete pe care le vede."
            >
              <CountryChecklist
                value={form.excludedDestinations}
                onChange={(next) => setForm({ ...form, excludedDestinations: next })}
              />
            </Field>

            <Field label="Colectări">
              <CollectionsPicker
                value={form.allowedCollectionCountries}
                onChange={(next) => setForm({ ...form, allowedCollectionCountries: next })}
              />
            </Field>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.sharedPickupCounter}
                onChange={(event) =>
                  setForm({ ...form, sharedPickupCounter: event.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
              />
              <span>
                <span className="font-semibold">Contor comun de ridicări</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Normal, fiecare rută (origine → destinație) își numerotează coletele separat, din
                  intervalul ei. Bifat, numerotarea ignoră ruta și toate coletele contului trag
                  numere dintr-un singur șir — cazul șoferului care ridică din mai multe țări în
                  aceeași cursă (de exemplu NL și BE). Atunci toate rutele contului trebuie să aibă
                  exact același interval.
                </span>
              </span>
            </label>

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

            {creating && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rute și intervale de numere
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Fiecare rută are propriul interval de numere de colet. Fără cel puțin o rută,
                  contul se creează, dar nu poate emite colete. Se pot adăuga și mai târziu.
                </p>

                {newRanges.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {newRanges.map((row, index) => (
                      <li
                        key={`${row.origin}-${row.destination}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-slate-700">
                          {row.origin} → {row.destination} · {row.rangeStart}–{row.rangeEnd}
                        </span>
                        <IconButton
                          icon={Trash2}
                          label="Scoate ruta din listă"
                          tone="danger"
                          onClick={() =>
                            setNewRanges(newRanges.filter((_, i) => i !== index))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3">
                  <RangeFields value={newRange} onChange={setNewRange} />
                  <SecondaryButton icon={Plus} className="mt-2" onClick={addNewRange}>
                    Adaugă ruta
                  </SecondaryButton>
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {rangesDriver && (
        <RangesModal
          driver={rangesDriver}
          token={token}
          onClose={() => setRangesFor(null)}
          onLocked={onLocked}
          onSuccess={onSuccess}
          onChanged={load}
        />
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
            confirming.routeRanges.length > 0
              ? `Cele ${confirming.routeRanges.length} rute cu intervale de numere (${confirming.routeRanges
                  .map((r) => `${r.origin}→${r.destination}`)
                  .join(", ")}) se șterg odată cu el.`
              : "Contul nu are rute cu intervale de numere.",
            "Profilul (rol, destinații ascunse, acces la colectări) dispare odată cu el.",
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

// ──────────────────── Ecranul de rute al unui cont existent ────────────────────

/**
 * Aici fiecare rând e o resursă în sine (`/colete/[id]/ranges/[rangeId]`), deci
 * se salvează pe loc, nu la un „Salvează" global: un buton unic ar trebui să
 * calculeze singur ce s-a adăugat, ce s-a mutat și ce s-a șters, iar o rută
 * pierdută din diff înseamnă numere de colet emise greșit.
 */
function RangesModal({
  driver,
  token,
  onClose,
  onLocked,
  onSuccess,
  onChanged,
}: {
  driver: ColeteDriver;
  token: string;
  onClose: () => void;
  onLocked: () => void;
  onSuccess: (message: string) => void;
  onChanged: () => Promise<void>;
}) {
  const base = `${API}/${encodeURIComponent(driver.id)}/ranges`;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RangeForm>(emptyRange);
  const [adding, setAdding] = useState<RangeForm>(emptyRange);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function startEdit(range: ColeteRouteRange) {
    setEditingId(range.id);
    setDraft(rangeFormFrom(range));
    setError("");
  }

  async function saveEdit() {
    if (!editingId || busy) return;
    const problem = validateRange(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    const result = await apiFetch<Record<string, unknown>>(
      `${base}/${encodeURIComponent(editingId)}`,
      { method: "PATCH", body: JSON.stringify(rangePayload(draft)) },
      token,
    );
    setBusy(false);
    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      setError(result.error);
      return;
    }
    setEditingId(null);
    onSuccess(`Ruta ${draft.origin} → ${draft.destination} a fost salvată`);
    await onChanged();
  }

  async function add() {
    if (busy) return;
    const problem = validateRange(adding);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    const result = await apiFetch<Record<string, unknown>>(
      base,
      { method: "POST", body: JSON.stringify(rangePayload(adding)) },
      token,
    );
    setBusy(false);
    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      setError(result.error);
      return;
    }
    onSuccess(`Ruta ${adding.origin} → ${adding.destination} a fost adăugată`);
    setAdding(emptyRange());
    await onChanged();
  }

  async function removeRange(range: ColeteRouteRange) {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = await apiFetch<Record<string, unknown>>(
      `${base}/${encodeURIComponent(range.id)}`,
      { method: "DELETE" },
      token,
    );
    setBusy(false);
    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      setError(result.error);
      return;
    }
    if (editingId === range.id) setEditingId(null);
    onSuccess(`Ruta ${range.origin} → ${range.destination} a fost ștearsă`);
    await onChanged();
  }

  return (
    <Modal
      title={`Rute și intervale — „${driver.username}”`}
      size="lg"
      description="Numerele de colet se dau din intervalul rutei pe care circulă coletul. Fiecare rută are un singur interval, iar modificările se salvează pe rând, imediat."
      onClose={onClose}
      footer={<SecondaryButton onClick={onClose}>Închide</SecondaryButton>}
    >
      <div className="space-y-4">
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        {driver.sharedPickupCounter && (
          <div className="rounded-xl bg-purple-50 px-4 py-3 text-xs text-purple-800">
            <span className="font-semibold">Contul are contor comun de ridicări.</span> Numerotarea
            ignoră ruta și trage dintr-un singur șir, deci toate rutele de mai jos trebuie să aibă
            exact același interval.
          </div>
        )}

        {driver.routeRanges.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Contul nu are nicio rută. Fără cel puțin una, aplicația colete nu are din ce interval
            să dea numere și nu se poate înregistra niciun colet pe acest șofer.
          </p>
        ) : (
          <ul className="space-y-2">
            {driver.routeRanges.map((range) => (
              <li key={range.id} className="rounded-xl border border-slate-200 bg-white p-3">
                {editingId === range.id ? (
                  <div className="space-y-2">
                    <RangeFields value={draft} onChange={setDraft} disabled={busy} />
                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton loading={busy} onClick={() => void saveEdit()}>
                        Salvează ruta
                      </PrimaryButton>
                      <SecondaryButton disabled={busy} onClick={() => setEditingId(null)}>
                        Renunță
                      </SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm text-slate-900">
                        {range.origin} → {range.destination}
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        {countryLabel(range.origin)} → {countryLabel(range.destination)} ·{" "}
                        {range.rangeStart}–{range.rangeEnd} ({range.rangeEnd - range.rangeStart + 1}{" "}
                        numere)
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        icon={Pencil}
                        label="Editează ruta"
                        onClick={() => startEdit(range)}
                        disabled={busy}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Șterge ruta"
                        tone="danger"
                        onClick={() => void removeRange(range)}
                        disabled={busy}
                      />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <OverlapNotice ranges={driver.routeRanges} />

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Adaugă o rută
          </div>
          <div className="mt-2">
            <RangeFields value={adding} onChange={setAdding} disabled={busy} />
          </div>
          <SecondaryButton icon={Plus} className="mt-2" loading={busy} onClick={() => void add()}>
            Adaugă
          </SecondaryButton>
        </div>
      </div>
    </Modal>
  );
}
