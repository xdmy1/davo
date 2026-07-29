"use client";

/**
 * Tabul „Operatori rezervari” — conturile panoului de pe rezervari.davo.md.
 *
 * Deployul e altul, dar baza e aceeași, deci conturile se administrează de
 * aici. Două lucruri se văd altfel decât la admini: identificatorul de login
 * (`slug`) se generează din nume și nu se mai schimbă niciodată — regenerarea
 * i-ar tăia operatorului accesul — iar ștergerea unui operator cu rezervări
 * atribuite e refuzată, fiindcă ar rupe legătura dintre rezervări și cel care
 * le-a făcut. În locul erorii brute, tabul propune direct dezactivarea.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import Badge from "@/components/admin/Badge";
import {
  apiFetch,
  reportFailure,
  type AccountsTabProps,
  type OperatorAccount,
  type RezervariListResponse,
  type RezervariMutationResponse,
  type RezervariRole,
  type SectionOption,
} from "@/lib/accountsClient";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  formatDateTime,
  IconButton,
  inputCls,
  Modal,
  PermissionPicker,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TableSkeleton,
} from "./shared";

const ENDPOINT = "/api/admin/accounts/rezervari";

/** Exact 4 cifre — formularul de login din panoul operatorilor are patru căsuțe. */
const PIN_RE = /^\d{4}$/;
const PIN_ERROR = "PIN-ul trebuie să fie 4 cifre";

const FORM_ID = "rezervari-operator-form";

const ROLE_LABELS: Record<RezervariRole, string> = {
  operator: "Operator",
  supervisor: "Supervizor",
};

type Form = {
  name: string;
  pin: string;
  role: RezervariRole;
  active: boolean;
  permissions: string[];
};

/**
 * Copie a lui `slugify` din rutele API, ca previzualizarea din formular să
 * arate exact identificatorul care se va salva. Serverul rămâne cel care
 * decide (poate adăuga un sufix la coliziune), aici e doar o promisiune
 * corectă făcută adminului înainte de salvare.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // scoate diacriticele desprinse de NFD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function effectiveKeys(
  role: RezervariRole,
  permissions: string[],
  presets: Record<RezervariRole, string[]>,
): string[] {
  return permissions.length > 0 ? permissions : (presets[role] ?? []);
}

/** Tooltipul se pierde pe un `<button disabled>`; ambalajul îl păstrează. */
function Guarded({ reason, children }: { reason: string; children: React.ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <span title={reason} className="inline-flex cursor-not-allowed">
      {children}
    </span>
  );
}

export default function RezervariTab({
  token,
  meta,
  onLocked,
  onError,
  onSuccess,
}: AccountsTabProps) {
  const [operators, setOperators] = useState<OperatorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OperatorAccount | null>(null);
  const [resetting, setResetting] = useState<OperatorAccount | null>(null);
  const [deleting, setDeleting] = useState<OperatorAccount | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  /** Motivul pentru care serverul a refuzat ștergerea — comută dialogul pe varianta cu dezactivare. */
  const [deleteBlocked, setDeleteBlocked] = useState("");

  const handlers = useRef({ onLocked, onError });
  useEffect(() => {
    handlers.current = { onLocked, onError };
  });

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      const result = await apiFetch<RezervariListResponse>(ENDPOINT, undefined, token);
      setLoading(false);
      if (!result.ok) {
        if (result.locked) {
          handlers.current.onLocked();
          return;
        }
        setLoadError(result.error);
        return;
      }
      setLoadError("");
      setOperators(result.data.operators);
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Creare sau editare; întoarce mesajul de eroare („” = a mers). */
  async function submit(
    payload: Record<string, unknown>,
    operator: OperatorAccount | null,
    /** Confirmare mai precisă decât „a fost actualizat”, când operația are un singur scop. */
    successMessage?: string,
  ) {
    const result = await apiFetch<RezervariMutationResponse>(
      operator ? `${ENDPOINT}/${operator.id}` : ENDPOINT,
      { method: operator ? "PATCH" : "POST", body: JSON.stringify(payload) },
      token,
    );

    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return "";
      }
      return result.error;
    }

    setCreating(false);
    setEditing(null);
    setResetting(null);
    onSuccess(
      successMessage ??
        (operator
          ? `Operatorul ${result.data.operator.name} a fost actualizat`
          : `Operatorul ${result.data.operator.name} a fost creat — se autentifică cu identificatorul ${result.data.operator.slug}`),
    );
    void load({ silent: true });
    return "";
  }

  async function setActive(operator: OperatorAccount, active: boolean) {
    setBusyId(operator.id);
    const result = await apiFetch<RezervariMutationResponse>(
      `${ENDPOINT}/${operator.id}`,
      { method: "PATCH", body: JSON.stringify({ active }) },
      token,
    );
    setBusyId("");

    if (!result.ok) {
      reportFailure(result, { onLocked, onError });
      return false;
    }

    onSuccess(
      active
        ? `Operatorul ${operator.name} a fost activat`
        : `Operatorul ${operator.name} a fost dezactivat — rezervările lui rămân legate de el`,
    );
    void load({ silent: true });
    return true;
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await apiFetch(`${ENDPOINT}/${deleting.id}`, { method: "DELETE" }, token);
    setDeleteBusy(false);

    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      // 409 = are rezervări atribuite. În loc să arunce mesajul serverului
      // peste listă, dialogul se transformă în oferta de dezactivare — asta e
      // oricum singura variantă care păstrează istoricul.
      if (result.status === 409) {
        setDeleteBlocked(result.error);
        return;
      }
      setDeleting(null);
      onError(result.error);
      return;
    }

    onSuccess(`Operatorul ${deleting.name} a fost șters`);
    setDeleting(null);
    void load({ silent: true });
  }

  async function deactivateInstead() {
    if (!deleting) return;
    setDeleteBusy(true);
    const done = await setActive(deleting, false);
    setDeleteBusy(false);
    if (done) closeDelete();
  }

  function closeDelete() {
    setDeleting(null);
    setDeleteBlocked("");
  }

  const activeCount = operators.filter((operator) => operator.active).length;
  const activeSupervisors = operators.filter(
    (operator) => operator.active && operator.role === "supervisor",
  ).length;

  function rowActions(operator: OperatorAccount) {
    const busy = busyId === operator.id;
    // Panoul operatorilor rămâne fără gestiune dacă dispare ultimul supervizor
    // activ; serverul refuză, iar butonul spune de ce încă dinainte.
    const lastSupervisor =
      operator.active && operator.role === "supervisor" && activeSupervisors === 1;
    const deactivateReason = lastSupervisor ? "Trebuie să rămână cel puțin un supervizor activ" : "";

    return (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton icon={Pencil} label="Editează operatorul" onClick={() => setEditing(operator)} />
        <IconButton icon={KeyRound} label="Schimbă PIN-ul" onClick={() => setResetting(operator)} />
        <Guarded reason={deactivateReason}>
          <IconButton
            icon={Power}
            label={
              deactivateReason ||
              (operator.active ? "Dezactivează operatorul" : "Activează operatorul")
            }
            onClick={() => void setActive(operator, !operator.active)}
            disabled={busy || deactivateReason !== ""}
          />
        </Guarded>
        <IconButton
          icon={Trash2}
          tone="danger"
          label="Șterge operatorul"
          onClick={() => {
            setDeleteBlocked("");
            setDeleting(operator);
          }}
        />
      </div>
    );
  }

  function permissionsCell(operator: OperatorAccount) {
    const keys = effectiveKeys(operator.role, operator.permissions, meta.rezervariPresets);
    const labels = meta.rezervariSections
      .filter((section) => keys.includes(section.key))
      .map((section) => section.label);
    const summary =
      keys.length === meta.rezervariSections.length
        ? "Tot panoul"
        : `${keys.length} ${keys.length === 1 ? "secțiune" : "secțiuni"}`;

    return (
      <span
        title={labels.length > 0 ? labels.join(", ") : "Nicio secțiune"}
        className="inline-flex items-center gap-1.5"
      >
        <span className="text-slate-700">{summary}</span>
        {operator.permissions.length === 0 && (
          <span className="text-xs text-slate-400">(presetul rolului)</span>
        )}
      </span>
    );
  }

  if (loading) return <TableSkeleton rows={5} cols={5} />;

  if (loadError) {
    return (
      <div>
        <ErrorBanner message={loadError} />
        <PrimaryButton onClick={() => void load()}>Încearcă din nou</PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {operators.length} {operators.length === 1 ? "operator" : "operatori"} · {activeCount}{" "}
          activi
        </p>
        <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>
          Operator nou
        </PrimaryButton>
      </div>

      {operators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Niciun operator încă"
          description="Adaugă primul operator care va prelua rezervări din panoul de pe rezervari.davo.md."
          action={
            <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>
              Operator nou
            </PrimaryButton>
          }
        />
      ) : (
        <>
          {/* Ecrane late: tabel. */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Operator</th>
                    <th className="px-5 py-3 text-left">Rol</th>
                    <th className="px-5 py-3 text-left">Permisiuni</th>
                    <th className="px-5 py-3 text-left">Stare</th>
                    <th className="px-5 py-3 text-left">Rezervări</th>
                    <th className="px-5 py-3 text-left">Ultima autentificare</th>
                    <th className="px-5 py-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {operators.map((operator) => (
                    <tr key={operator.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{operator.name}</div>
                        <div
                          className="mt-0.5 font-mono text-xs text-slate-500"
                          title="Identificatorul cu care se autentifică"
                        >
                          {operator.slug}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={operator.role === "supervisor" ? "purple" : "blue"}>
                          {ROLE_LABELS[operator.role]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">{permissionsCell(operator)}</td>
                      <td className="px-5 py-3">
                        <StatusBadge active={operator.active} />
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {operator.bookings}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatDateTime(operator.lastLogin)}
                      </td>
                      <td className="px-5 py-3">{rowActions(operator)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil: carduri, ca tabelul să nu se deruleze lateral. */}
          <div className="grid gap-3 md:hidden">
            {operators.map((operator) => (
              <div
                key={operator.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{operator.name}</div>
                    <div className="mt-0.5 font-mono text-xs text-slate-500">{operator.slug}</div>
                  </div>
                  <StatusBadge active={operator.active} />
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">Rol</dt>
                    <dd className="mt-0.5">
                      <Badge variant={operator.role === "supervisor" ? "purple" : "blue"}>
                        {ROLE_LABELS[operator.role]}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">Rezervări</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{operator.bookings}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">Permisiuni</dt>
                    <dd className="mt-0.5">{permissionsCell(operator)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-400">
                      Ultima autentificare
                    </dt>
                    <dd className="mt-0.5 text-slate-600">{formatDateTime(operator.lastLogin)}</dd>
                  </div>
                </dl>

                <div className="mt-3 border-t border-slate-100 pt-3">{rowActions(operator)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {(creating || editing) && (
        <OperatorModal
          key={editing?.id ?? "nou"}
          operator={editing}
          sections={meta.rezervariSections}
          presets={meta.rezervariPresets}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(payload) => submit(payload, editing)}
        />
      )}

      {resetting && (
        <PinModal
          operator={resetting}
          onClose={() => setResetting(null)}
          onSubmit={(pin) =>
            submit({ pin }, resetting, `PIN-ul lui ${resetting.name} a fost schimbat`)
          }
        />
      )}

      {deleting &&
        // Cu rezervări atribuite ștergerea nu e o opțiune: dialogul explică și
        // oferă direct singura cale care păstrează istoricul.
        (deleting.bookings > 0 || deleteBlocked ? (
          <Modal
            title="Ștergerea nu e posibilă"
            size="sm"
            onClose={deleteBusy ? () => {} : closeDelete}
            footer={
              <>
                <SecondaryButton onClick={closeDelete} disabled={deleteBusy}>
                  Renunță
                </SecondaryButton>
                {deleting.active && (
                  <PrimaryButton
                    icon={Power}
                    loading={deleteBusy}
                    onClick={() => void deactivateInstead()}
                  >
                    Dezactivează în schimb
                  </PrimaryButton>
                )}
              </>
            }
          >
            <p className="text-sm text-slate-700">
              {deleteBlocked ||
                `${deleting.name} are ${deleting.bookings} ${
                  deleting.bookings === 1 ? "rezervare atribuită" : "rezervări atribuite"
                }. Ștergerea contului ar lăsa rezervările fără autor.`}
            </p>
            <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>Dezactivat, operatorul nu se mai poate autentifica în panou.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>Rezervările lui rămân în istoric, legate de numele lui.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>•</span>
                <span>Îl poți reactiva oricând, cu aceleași permisiuni.</span>
              </li>
            </ul>
            {!deleting.active && (
              <p className="mt-3 text-sm text-slate-500">
                Contul e deja dezactivat — nu mai are acces la panou.
              </p>
            )}
          </Modal>
        ) : (
          <ConfirmDialog
            title="Ștergi operatorul definitiv?"
            message={`Contul ${deleting.name} (${deleting.slug}) dispare din baza de date. Dacă vrei doar să-i oprești accesul, dezactivează-l.`}
            consequences={[
              "Nu se va mai putea autentifica în panoul de pe rezervari.davo.md",
              `Identificatorul ${deleting.slug} devine liber și poate fi luat de alt operator`,
              "Permisiunile configurate pentru el se pierd",
            ]}
            loading={deleteBusy}
            onConfirm={() => void confirmDelete()}
            onCancel={closeDelete}
          />
        ))}
    </div>
  );
}

// ───────────────────────── Creare / editare ─────────────────────────

function OperatorModal({
  operator,
  sections,
  presets,
  onClose,
  onSubmit,
}: {
  /** `null` = formular de creare. */
  operator: OperatorAccount | null;
  sections: SectionOption[];
  presets: Record<RezervariRole, string[]>;
  onClose: () => void;
  /** Întoarce mesajul de eroare de la server; „” înseamnă că a reușit. */
  onSubmit: (payload: Record<string, unknown>) => Promise<string>;
}) {
  const [form, setForm] = useState<Form>({
    name: operator?.name ?? "",
    // Gol la editare: PIN-ul se schimbă doar dacă e completat.
    pin: "",
    role: operator?.role ?? "operator",
    active: operator?.active ?? true,
    permissions: operator?.permissions ?? [],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preset = presets[form.role] ?? [];
  // La editare slug-ul e cel salvat; la creare, previzualizarea din nume.
  const slug = operator ? operator.slug : slugify(form.name);

  function update(patch: Partial<Form>) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const name = form.name.trim();
    if (!name) {
      setError("Numele e obligatoriu");
      return;
    }
    if (!operator && !PIN_RE.test(form.pin)) {
      setError(PIN_ERROR);
      return;
    }
    if (operator && form.pin !== "" && !PIN_RE.test(form.pin)) {
      setError(PIN_ERROR);
      return;
    }
    if (!operator && !slugify(name)) {
      setError("Numele trebuie să conțină cel puțin o literă sau o cifră");
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      name,
      pin: form.pin,
      role: form.role,
      permissions: form.permissions,
    };
    if (operator) payload.active = form.active;

    const message = await onSubmit(payload);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <Modal
      title={operator ? "Editează operatorul" : "Operator nou"}
      description={
        operator
          ? "PIN-ul se schimbă doar dacă completezi câmpul dedicat."
          : "Operatorul se autentifică pe rezervari.davo.md cu identificatorul și PIN-ul de mai jos."
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={saving}>
            Anulează
          </SecondaryButton>
          <PrimaryButton type="submit" form={FORM_ID} loading={saving}>
            {operator ? "Salvează" : "Creează operatorul"}
          </PrimaryButton>
        </>
      }
    >
      <form id={FORM_ID} className="grid gap-4" onSubmit={handleSubmit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nume">
            <input
              autoFocus
              value={form.name}
              onChange={(event) => update({ name: event.target.value })}
              className={inputCls}
              placeholder="Olga Rusu"
            />
          </Field>
          <Field
            label="Identificator"
            hint={
              operator
                ? "Se folosește la autentificare și nu se schimbă nici dacă redenumești contul."
                : "Se generează automat din nume. Dacă e deja ocupat, primește un sufix numeric."
            }
          >
            <input
              readOnly
              value={slug || "—"}
              tabIndex={-1}
              aria-label="Identificatorul de autentificare"
              className={`${inputCls} cursor-not-allowed bg-slate-50 font-mono text-slate-600`}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={operator ? "PIN nou" : "PIN"}
            hint={operator ? "Lasă gol ca să rămână PIN-ul actual." : "Exact 4 cifre."}
          >
            <input
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={form.pin}
              // Doar cifre: o literă strecurată ar produce o eroare de validare
              // fără ca adminul să vadă de ce.
              onChange={(event) => update({ pin: event.target.value.replace(/\D/g, "") })}
              className={`${inputCls} font-mono tracking-[0.4em]`}
              placeholder={operator ? "••••" : "0000"}
            />
          </Field>

          <Field
            label="Rol"
            hint="Supervizorul poate administra ceilalți operatori din panoul lor."
          >
            <select
              value={form.role}
              onChange={(event) => update({ role: event.target.value as RezervariRole })}
              className={inputCls}
            >
              <option value="operator">{ROLE_LABELS.operator}</option>
              <option value="supervisor">{ROLE_LABELS.supervisor}</option>
            </select>
          </Field>
        </div>

        {operator && (
          <Field
            label="Stare"
            hint="Contul dezactivat rămâne legat de rezervările lui, dar nu se mai poate autentifica."
          >
            <label className="inline-flex items-center gap-2 py-1 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => update({ active: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
              />
              Cont activ
            </label>
          </Field>
        )}

        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Secțiuni din panoul operatorilor
          </span>
          <PermissionPicker
            sections={sections}
            value={form.permissions}
            onChange={(permissions) => update({ permissions })}
            preset={preset}
          />
        </div>

        {operator && operator.bookings > 0 && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Are {operator.bookings}{" "}
            {operator.bookings === 1 ? "rezervare atribuită" : "rezervări atribuite"} — contul nu
            poate fi șters, doar dezactivat.
          </p>
        )}
      </form>
    </Modal>
  );
}

// ───────────────────────── Schimbare de PIN ─────────────────────────

/**
 * PIN-ul e stocat doar ca hash, deci nu poate fi arătat înapoi — se poate doar
 * înlocui. Formularul separat ține operația scurtă: se cere la telefon, se
 * schimbă, gata, fără riscul de a atinge rolul sau permisiunile.
 */
function PinModal({
  operator,
  onClose,
  onSubmit,
}: {
  operator: OperatorAccount;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<string>;
}) {
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!PIN_RE.test(pin)) {
      setError(PIN_ERROR);
      return;
    }
    if (pin !== confirmation) {
      setError("Cele două PIN-uri nu coincid");
      return;
    }

    setSaving(true);
    const message = await onSubmit(pin);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <Modal
      title="Schimbă PIN-ul"
      description={`PIN nou pentru ${operator.name} (${operator.slug}).`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={saving}>
            Anulează
          </SecondaryButton>
          <PrimaryButton type="submit" form="rezervari-pin-form" loading={saving}>
            Schimbă PIN-ul
          </PrimaryButton>
        </>
      }
    >
      <form id="rezervari-pin-form" className="grid gap-4" onSubmit={handleSubmit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <Field label="PIN nou" hint="Exact 4 cifre.">
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            className={`${inputCls} font-mono tracking-[0.4em]`}
            placeholder="0000"
          />
        </Field>
        <Field label="Confirmă PIN-ul">
          <input
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, ""))}
            className={`${inputCls} font-mono tracking-[0.4em]`}
            placeholder="0000"
          />
        </Field>

        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          PIN-ul vechi devine inutilizabil imediat. Comunică-l pe cel nou înainte de a salva.
        </p>
      </form>
    </Modal>
  );
}
