"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Info,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/admin/Badge";
import EmptyState from "@/components/admin/EmptyState";

// Admin → Orașe: orașele de pornire (Moldova) și de sosire (țările străine).
// Tot ce se salvează aici ajunge în tabela City din baza partajată → apare și
// pe davo.md (picker-e, orar ridicări), și pe rezervari.davo.md (panou +
// formularul de rezervare), în cel mult un minut.

type City = {
  id: string;
  name: string;
  nameRu: string | null;
  slug: string;
  isOrigin: boolean;
  sortOrder: number;
  active: boolean;
  pickupOffsetMin: number | null;
  passengerCountries: string[];
  routeCount: number;
};

type Country = {
  id: string;
  name: string;
  slug: string;
  flag: string | null;
  isMoldova: boolean;
  cities: City[];
};

type DestCountry = { slug: string; name: string };

type CityForm = {
  id?: string;
  countryId: string;
  name: string;
  nameRu: string;
  pickupOffsetMin: string;
  passengerCountries: string[];
  active: boolean;
};

export default function OrasePage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [destCountries, setDestCountries] = useState<DestCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCountryId, setActiveCountryId] = useState<string>("");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<City | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load(keepCountry = true) {
    setLoading(countries.length === 0);
    setError(null);
    try {
      const res = await fetch("/api/admin/cities").then((r) => r.json());
      if (!res?.success) {
        setError(res?.error ?? "Nu s-au putut încărca orașele");
        return;
      }
      const list: Country[] = res.countries;
      setCountries(list);
      setDestCountries(res.destinationCountries ?? []);
      if (!keepCountry || !activeCountryId || !list.some((c) => c.id === activeCountryId)) {
        setActiveCountryId(list[0]?.id ?? "");
      }
    } catch {
      setError("Nu s-au putut încărca orașele");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const country = countries.find((c) => c.id === activeCountryId) ?? null;

  const visible = useMemo(() => {
    if (!country) return [] as City[];
    const k = q.trim().toLowerCase();
    return country.cities.filter((c) => {
      if (!showInactive && !c.active) return false;
      if (!k) return true;
      return c.name.toLowerCase().includes(k) || (c.nameRu ?? "").toLowerCase().includes(k);
    });
  }, [country, q, showInactive]);

  const totalActive = countries.reduce((n, c) => n + c.cities.filter((x) => x.active).length, 0);

  async function save(form: CityForm) {
    const payload = {
      id: form.id,
      countryId: form.countryId,
      name: form.name,
      nameRu: form.nameRu.trim() || null,
      pickupOffsetMin: form.pickupOffsetMin.trim() === "" ? null : Number(form.pickupOffsetMin),
      passengerCountries: form.passengerCountries,
      active: form.active,
    };
    const res = await fetch("/api/admin/cities", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error ?? "Eroare la salvare");
      return false;
    }
    setEditing(null);
    if (!form.id) setActiveCountryId(form.countryId);
    setFlash(
      form.id
        ? `„${form.name}” salvat.`
        : `„${form.name}” adăugat${data.routesCreated ? ` (+${data.routesCreated} rute Chișinău ⇄ ${form.name})` : ""}.`
    );
    await load();
    return true;
  }

  async function toggleActive(c: City) {
    setBusy(c.id);
    try {
      const res = await fetch("/api/admin/cities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, active: !c.active }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error ?? "Eroare");
        return;
      }
      setFlash(`„${c.name}” ${c.active ? "ascuns de pe site" : "reactivat"}.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: City) {
    const msg = c.routeCount
      ? `Ștergi „${c.name}” și cele ${c.routeCount} rute ale lui? Rezervările vechi rămân (au orașul salvat ca text). Dacă există curse cu rezervări, ștergerea e refuzată — folosește „Ascunde”.`
      : `Ștergi „${c.name}”? Rezervările vechi rămân (au orașul salvat ca text).`;
    if (!confirm(msg)) return;
    setBusy(c.id);
    try {
      const res = await fetch(`/api/admin/cities?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        alert(data.error ?? "Nu s-a putut șterge");
        return;
      }
      setFlash(`„${c.name}” șters.`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function move(c: City, dir: -1 | 1) {
    if (!country) return;
    const ids = country.cities.map((x) => x.id);
    const i = ids.indexOf(c.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // Optimist: reordonăm local, apoi salvăm.
    setCountries((prev) =>
      prev.map((ct) =>
        ct.id !== country.id
          ? ct
          : { ...ct, cities: ids.map((id, idx) => ({ ...ct.cities.find((x) => x.id === id)!, sortOrder: idx })) }
      )
    );
    const res = await fetch("/api/admin/cities/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error ?? "Nu s-a putut salva ordinea");
      await load();
    }
  }

  return (
    <div>
      <PageHeader
        title="Orașe"
        subtitle={`${totalActive} orașe active pe site · orașele de pornire (Moldova) și de sosire (Anglia, Germania, Belgia, Olanda, Luxemburg)`}
        actions={
          <button
            onClick={() => setEditing("new")}
            disabled={countries.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" /> Oraș nou
          </button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          Lista e <strong>partajată cu rezervari.davo.md</strong>: ce salvezi aici apare în picker-ele de
          rezervare de pe ambele site-uri și în panoul operatorilor în cel mult un minut. Un oraș cu
          rezervări nu se șterge — se <strong>ascunde</strong> (dispare de pe site, rezervările rămân).
          Orașele MD sunt opriri pe cursa de Chișinău; pentru fiecare bifezi țările pentru care se oferă
          pasagerilor (coletele se ridică din toate).
        </div>
      </div>

      {flash && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          ✓ {flash}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          {/* Țările */}
          <div className="space-y-4">
            <nav className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pornire
              </div>
              {countries.filter((c) => c.isMoldova).map((c) => (
                <CountryTab key={c.id} c={c} active={c.id === activeCountryId} onClick={() => setActiveCountryId(c.id)} />
              ))}
              <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Sosire
              </div>
              {countries.filter((c) => !c.isMoldova).map((c) => (
                <CountryTab key={c.id} c={c} active={c.id === activeCountryId} onClick={() => setActiveCountryId(c.id)} />
              ))}
            </nav>
          </div>

          {/* Orașele țării alese */}
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Caută oraș…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                />
                Arată și orașele ascunse
              </label>
              <span className="ml-auto text-xs text-slate-500">
                {visible.length} {visible.length === 1 ? "oraș" : "orașe"}
              </span>
            </div>

            {!country ? (
              <EmptyState icon={MapPinned} title="Nicio țară" description="Rulează seed-ul bazei de date." />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={MapPinned}
                title={q ? "Niciun rezultat" : `Niciun oraș în ${country.name}`}
                description={q ? "Încearcă alt nume." : "Adaugă primul oraș cu butonul „Oraș nou”."}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="w-10 px-3 py-2.5 text-left">#</th>
                        <th className="px-3 py-2.5 text-left">Oraș</th>
                        <th className="px-3 py-2.5 text-left">RU</th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap" title="Minute față de ora-ancoră a țării (vezi Orar ridicări)">
                          Offset orar
                        </th>
                        {country.isMoldova && <th className="px-3 py-2.5 text-left">Pasageri către</th>}
                        {!country.isMoldova && <th className="px-3 py-2.5 text-left">Rute</th>}
                        <th className="px-3 py-2.5 text-left">Stare</th>
                        <th className="px-3 py-2.5 text-right">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visible.map((c) => {
                        const idx = country.cities.findIndex((x) => x.id === c.id);
                        const isHub = c.slug === "chisinau";
                        return (
                          <tr key={c.id} className={c.active ? "hover:bg-slate-50" : "bg-slate-50/60 text-slate-400 hover:bg-slate-100/60"}>
                            <td className="px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <div className={`font-medium ${c.active ? "text-slate-900" : "text-slate-500 line-through"}`}>
                                {c.name}
                                {isHub && <Badge variant="orange" className="ml-2">hub</Badge>}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{c.nameRu ?? <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">
                              {c.pickupOffsetMin == null ? (
                                <span className="text-amber-600">nesetat</span>
                              ) : (
                                `${c.pickupOffsetMin >= 0 ? "+" : ""}${c.pickupOffsetMin} min`
                              )}
                            </td>
                            {country.isMoldova && (
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {c.passengerCountries.length === 0 ? (
                                    <span className="text-xs text-slate-400">doar colete</span>
                                  ) : (
                                    destCountries
                                      .filter((d) => c.passengerCountries.includes(d.slug))
                                      .map((d) => (
                                        <span key={d.slug} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                          {d.name}
                                        </span>
                                      ))
                                  )}
                                </div>
                              </td>
                            )}
                            {!country.isMoldova && (
                              <td className="px-3 py-2 text-xs text-slate-500">{c.routeCount}</td>
                            )}
                            <td className="px-3 py-2">
                              {c.active ? (
                                <Badge variant="green" className="whitespace-nowrap">Pe site</Badge>
                              ) : (
                                <Badge variant="slate" className="whitespace-nowrap">Ascuns</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => move(c, -1)}
                                  disabled={idx <= 0 || !!q}
                                  title="Mai sus"
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => move(c, 1)}
                                  disabled={idx < 0 || idx >= country.cities.length - 1 || !!q}
                                  title="Mai jos"
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => toggleActive(c)}
                                  disabled={busy === c.id || isHub}
                                  title={c.active ? "Ascunde de pe site" : "Arată pe site"}
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                >
                                  {c.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => setEditing(c)}
                                  title="Editează"
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-orange-600"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => remove(c)}
                                  disabled={busy === c.id || isHub}
                                  title="Șterge"
                                  className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {q && (
                  <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
                    Reordonarea e disponibilă doar fără filtru de căutare.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {editing !== null && (
        <CityModal
          initial={editing === "new" ? null : editing}
          defaultCountryId={country?.id ?? countries[0]?.id ?? ""}
          countries={countries}
          destCountries={destCountries}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function CountryTab({ c, active, onClick }: { c: Country; active: boolean; onClick: () => void }) {
  const n = c.cities.filter((x) => x.active).length;
  const hidden = c.cities.length - n;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        active ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className="text-base leading-none">{c.flag ?? "🏳️"}</span>
      <span className="flex-1 truncate">{c.name}</span>
      <span className={`text-xs ${active ? "text-orange-600" : "text-slate-400"}`}>
        {n}
        {hidden > 0 && <span className="text-slate-300"> +{hidden}</span>}
      </span>
    </button>
  );
}

function CityModal({
  initial,
  defaultCountryId,
  countries,
  destCountries,
  onClose,
  onSave,
}: {
  initial: City | null;
  defaultCountryId: string;
  countries: Country[];
  destCountries: DestCountry[];
  onClose: () => void;
  onSave: (f: CityForm) => Promise<boolean>;
}) {
  const initialCountryId = initial
    ? countries.find((c) => c.cities.some((x) => x.id === initial.id))?.id ?? defaultCountryId
    : defaultCountryId;
  const [form, setForm] = useState<CityForm>({
    id: initial?.id,
    countryId: initialCountryId,
    name: initial?.name ?? "",
    nameRu: initial?.nameRu ?? "",
    pickupOffsetMin: initial?.pickupOffsetMin == null ? "" : String(initial.pickupOffsetMin),
    passengerCountries: initial?.passengerCountries ?? destCountries.map((d) => d.slug),
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const country = countries.find((c) => c.id === form.countryId);
  const isMoldova = !!country?.isMoldova;
  const isHub = initial?.slug === "chisinau";

  function togglePc(slug: string) {
    setForm((f) => ({
      ...f,
      passengerCountries: f.passengerCountries.includes(slug)
        ? f.passengerCountries.filter((s) => s !== slug)
        : [...f.passengerCountries, slug],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{initial ? `Editează „${initial.name}”` : "Oraș nou"}</h3>
        </div>
        <form
          className="grid gap-4 px-5 py-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onSave(form);
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Țara">
            <select
              value={form.countryId}
              onChange={(e) => setForm({ ...form, countryId: e.target.value })}
              className={inputCls}
              disabled={!!initial}
              required
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag ?? ""} {c.name}
                  {c.isMoldova ? " (pornire)" : " (sosire)"}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nume (RO)">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="ex. Reading"
                maxLength={60}
                required
                disabled={isHub}
                autoFocus
              />
            </Field>
            <Field label="Nume (RU) — opțional">
              <input
                value={form.nameRu}
                onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
                className={inputCls}
                placeholder="ex. Рединг"
                maxLength={60}
              />
            </Field>
          </div>
          <Field label="Offset orar (minute) — opțional">
            <input
              type="number"
              value={form.pickupOffsetMin}
              onChange={(e) => setForm({ ...form, pickupOffsetMin: e.target.value })}
              className={inputCls}
              placeholder={isMoldova ? "minute după plecarea din Chișinău" : "minute după plecarea din primul oraș al țării"}
              step={5}
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Folosit în „Orar ridicări” și pentru ora de pe bilet. Gol = ora nu se calculează pentru orașul ăsta.
            </span>
          </Field>
          {isMoldova && (
            <Field label="Se oferă pasagerilor pentru">
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                {destCountries.map((d) => (
                  <label key={d.slug} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.passengerCountries.includes(d.slug)}
                      onChange={() => togglePc(d.slug)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                    />
                    {d.name}
                  </label>
                ))}
              </div>
              <span className="mt-1 block text-[11px] text-slate-500">
                Nimic bifat = orașul apare doar la colete. Coletele se ridică din toate orașele MD active.
              </span>
            </Field>
          )}
          {!isMoldova && !initial && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Se creează automat rutele <strong>Chișinău ⇄ {form.name || "oraș"}</strong> cu prețul și moneda
              rutelor existente ale țării — le poți ajusta apoi în „Rute”.
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
              disabled={isHub}
            />
            Vizibil pe site
          </label>
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim() || !form.countryId}
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? "Salvez…" : "Salvează"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-slate-50 disabled:text-slate-500";
