"use client";

/**
 * Tabul „Admini davo.md” — conturile care intră în /admin.
 *
 * Regulile care pot încuia panoul definitiv (nu te poți șterge, dezactiva sau
 * retrograda pe tine însuți; trebuie să rămână un administrator activ cu acces
 * la „Conturi & Acces”) sunt impuse de server. Aici sunt doar oglindite:
 * acțiunile interzise pe propriul cont apar dezactivate, cu motivul la hover,
 * ca adminul să afle regula înainte să trimită o cerere care oricum ar fi
 * refuzată — și ca refuzul să nu pară un bug.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, Mail, Pencil, Plus, Power, ShieldCheck, Trash2 } from "lucide-react";
import Badge from "@/components/admin/Badge";
import {
  apiFetch,
  reportFailure,
  type AccountsTabProps,
  type AdminAccount,
  type DavoListResponse,
  type DavoMutationResponse,
  type Role,
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

const ENDPOINT = "/api/admin/accounts/davo";

/** Identic cu minimul impus de rutele API — validarea locală doar scutește un drum până la server. */
const MIN_PASSWORD_LENGTH = 8;

/** Cheia secțiunii curente: fără ea, contul nu mai poate deschide panoul ăsta. */
const ACCOUNTS_KEY = "accounts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  admin2: "Acces limitat",
};

const FORM_ID = "davo-account-form";

type Form = {
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  permissions: string[];
};

/** Lista brută goală înseamnă „presetul rolului”, deci accesul real se calculează, nu se citește. */
function effectiveKeys(
  role: Role,
  permissions: string[],
  presets: Record<Role, string[]>,
): string[] {
  return permissions.length > 0 ? permissions : (presets[role] ?? []);
}

/** Ambalaj care păstrează tooltipul pe butoanele dezactivate — un `<button disabled>` nu-l mai arată. */
function Guarded({ reason, children }: { reason: string; children: React.ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <span title={reason} className="inline-flex cursor-not-allowed">
      {children}
    </span>
  );
}

export default function DavoTab({ token, meta, onLocked, onError, onSuccess }: AccountsTabProps) {
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [meId, setMeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");

  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminAccount | null>(null);
  const [deleting, setDeleting] = useState<AdminAccount | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Callback-urile paginii pot fi recreate la fiecare randare. Ținute într-un
  // ref, `load` rămâne stabil, deci efectul de mai jos nu reîncarcă lista în
  // buclă doar pentru că s-a re-randat antetul.
  const handlers = useRef({ onLocked, onError });
  useEffect(() => {
    handlers.current = { onLocked, onError };
  });

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      const result = await apiFetch<DavoListResponse>(ENDPOINT, undefined, token);
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
      setUsers(result.data.users);
      setMeId(result.data.meId);
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** Trimite creare sau editare și întoarce mesajul de eroare („” = a mers). */
  async function submit(
    payload: Record<string, unknown>,
    account: AdminAccount | null,
    /** Confirmare mai precisă decât „a fost actualizat”, când operația are un singur scop. */
    successMessage?: string,
  ) {
    const result = await apiFetch<DavoMutationResponse>(
      account ? `${ENDPOINT}/${account.id}` : ENDPOINT,
      { method: account ? "PATCH" : "POST", body: JSON.stringify(payload) },
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
        (account
          ? `Contul ${result.data.user.email} a fost actualizat`
          : `Contul ${result.data.user.email} a fost creat`),
    );
    // Reîncărcare completă: ordinea listei ține de `active` și de nume, iar o
    // înlocuire pe loc ar lăsa rândul editat într-o poziție greșită.
    void load({ silent: true });
    return "";
  }

  async function toggleActive(user: AdminAccount) {
    setBusyId(user.id);
    const result = await apiFetch<DavoMutationResponse>(
      `${ENDPOINT}/${user.id}`,
      { method: "PATCH", body: JSON.stringify({ active: !user.active }) },
      token,
    );
    setBusyId("");

    if (!result.ok) {
      reportFailure(result, { onLocked, onError });
      return;
    }
    onSuccess(
      result.data.user.active
        ? `Contul ${result.data.user.email} a fost activat`
        : `Contul ${result.data.user.email} a fost dezactivat — datele rămân, autentificarea e refuzată`,
    );
    void load({ silent: true });
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await apiFetch(`${ENDPOINT}/${deleting.id}`, { method: "DELETE" }, token);
    setDeleteBusy(false);

    if (!result.ok) {
      // Dialogul se închide ca mesajul serverului (ultimul administrator cu
      // acces, de pildă) să fie citit peste listă, nu peste o confirmare care
      // n-are ce să mai confirme.
      setDeleting(null);
      reportFailure(result, { onLocked, onError });
      return;
    }

    onSuccess(`Contul ${deleting.email} a fost șters`);
    setDeleting(null);
    void load({ silent: true });
  }

  const activeCount = users.filter((user) => user.active).length;

  function rowActions(user: AdminAccount) {
    const isSelf = user.id === meId;
    const busy = busyId === user.id;

    // Motivele sunt scrise ca text de tooltip: adminul vede de ce nu poate,
    // nu doar un buton stins.
    const deactivateReason =
      isSelf && user.active ? "Nu te poți dezactiva pe tine însuți" : "";
    const deleteReason = isSelf ? "Nu te poți șterge pe tine însuți" : "";

    return (
      <div className="flex items-center justify-end gap-0.5">
        <IconButton icon={Pencil} label="Editează contul" onClick={() => setEditing(user)} />
        <IconButton
          icon={KeyRound}
          label="Resetează parola"
          onClick={() => setResetting(user)}
        />
        <Guarded reason={deactivateReason}>
          <IconButton
            icon={Power}
            label={
              deactivateReason || (user.active ? "Dezactivează contul" : "Activează contul")
            }
            onClick={() => void toggleActive(user)}
            disabled={busy || deactivateReason !== ""}
          />
        </Guarded>
        <Guarded reason={deleteReason}>
          <IconButton
            icon={Trash2}
            tone="danger"
            label={deleteReason || "Șterge contul"}
            onClick={() => setDeleting(user)}
            disabled={deleteReason !== ""}
          />
        </Guarded>
      </div>
    );
  }

  function permissionsCell(user: AdminAccount) {
    const keys = effectiveKeys(user.role, user.permissions, meta.davoPresets);
    const labels = meta.davoSections
      .filter((section) => keys.includes(section.key))
      .map((section) => section.label);
    const summary =
      keys.length === meta.davoSections.length
        ? "Toate secțiunile"
        : `${keys.length} ${keys.length === 1 ? "secțiune" : "secțiuni"}`;

    return (
      <span
        title={labels.length > 0 ? labels.join(", ") : "Nicio secțiune"}
        className="inline-flex items-center gap-1.5"
      >
        <span className="text-slate-700">{summary}</span>
        {user.permissions.length === 0 && (
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
          {users.length} {users.length === 1 ? "cont" : "conturi"} · {activeCount} active
        </p>
        <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>
          Administrator nou
        </PrimaryButton>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Niciun cont încă"
          description="Adaugă primul administrator care se va putea autentifica pe davo.md."
          action={
            <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>
              Administrator nou
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
                    <th className="px-5 py-3 text-left">Administrator</th>
                    <th className="px-5 py-3 text-left">Rol</th>
                    <th className="px-5 py-3 text-left">Permisiuni</th>
                    <th className="px-5 py-3 text-left">Stare</th>
                    <th className="px-5 py-3 text-left">Ultima autentificare</th>
                    <th className="px-5 py-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const isSelf = user.id === meId;
                    return (
                      <tr key={user.id} className={isSelf ? "bg-orange-50/50" : "hover:bg-slate-50"}>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">{user.name}</span>
                            {isSelf && <Badge variant="orange">Contul tău</Badge>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={user.role === "admin" ? "purple" : "blue"}>
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">{permissionsCell(user)}</td>
                        <td className="px-5 py-3">
                          <StatusBadge active={user.active} />
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {formatDateTime(user.lastLogin)}
                        </td>
                        <td className="px-5 py-3">{rowActions(user)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil: același conținut ca rânduri de card, ca să nu se deruleze lateral. */}
          <div className="grid gap-3 md:hidden">
            {users.map((user) => {
              const isSelf = user.id === meId;
              return (
                <div
                  key={user.id}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    isSelf ? "border-orange-200 bg-orange-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{user.name}</span>
                        {isSelf && <Badge variant="orange">Contul tău</Badge>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                    <StatusBadge active={user.active} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-400">Rol</dt>
                      <dd className="mt-0.5">
                        <Badge variant={user.role === "admin" ? "purple" : "blue"}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-400">
                        Permisiuni
                      </dt>
                      <dd className="mt-0.5 text-sm">{permissionsCell(user)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wider text-slate-400">
                        Ultima autentificare
                      </dt>
                      <dd className="mt-0.5 text-slate-600">{formatDateTime(user.lastLogin)}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-t border-slate-100 pt-3">{rowActions(user)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(creating || editing) && (
        <AccountModal
          key={editing?.id ?? "nou"}
          account={editing}
          isSelf={editing !== null && editing.id === meId}
          sections={meta.davoSections}
          presets={meta.davoPresets}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(payload) => submit(payload, editing)}
        />
      )}

      {resetting && (
        <PasswordModal
          account={resetting}
          onClose={() => setResetting(null)}
          onSubmit={(password) =>
            submit({ password }, resetting, `Parola pentru ${resetting.email} a fost schimbată`)
          }
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Ștergi contul definitiv?"
          message={`Contul ${deleting.name} (${deleting.email}) dispare din baza de date. Dacă vrei doar să-i blochezi accesul, dezactivează-l — datele rămân neatinse.`}
          consequences={[
            "Nu se va mai putea autentifica pe davo.md",
            "Permisiunile configurate pentru el se pierd",
            "Intrările lui din jurnal rămân, dar nu mai pot fi legate de un cont existent",
          ]}
          loading={deleteBusy}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────── Creare / editare ─────────────────────────

function AccountModal({
  account,
  isSelf,
  sections,
  presets,
  onClose,
  onSubmit,
}: {
  /** `null` = formular de creare. */
  account: AdminAccount | null;
  isSelf: boolean;
  sections: SectionOption[];
  presets: Record<Role, string[]>;
  onClose: () => void;
  /** Întoarce mesajul de eroare de la server; „” înseamnă că a reușit. */
  onSubmit: (payload: Record<string, unknown>) => Promise<string>;
}) {
  const [form, setForm] = useState<Form>({
    name: account?.name ?? "",
    email: account?.email ?? "",
    // Gol la editare: parola se schimbă doar dacă e completată.
    password: "",
    role: account?.role ?? "admin",
    active: account?.active ?? true,
    permissions: account?.permissions ?? [],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preset = presets[form.role] ?? [];
  const effective = effectiveKeys(form.role, form.permissions, presets);
  // Retrogradarea propriului cont e refuzată de server; select-ul rămâne blocat
  // ca alegerea să nu pară posibilă.
  const lockedRole = isSelf && account?.role === "admin";

  function update(patch: Partial<Form>) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      setError("Numele e obligatoriu");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Emailul nu pare valid");
      return;
    }
    if (!account && form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Parola trebuie să aibă minimum ${MIN_PASSWORD_LENGTH} caractere`);
      return;
    }
    if (account && form.password !== "" && form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Parola nouă trebuie să aibă minimum ${MIN_PASSWORD_LENGTH} caractere`);
      return;
    }
    if (isSelf && !effective.includes(ACCOUNTS_KEY)) {
      setError(
        "Nu-ți poți retrage propriul acces la „Conturi & Acces” — altfel nu mai poți intra aici.",
      );
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      name,
      email,
      password: form.password,
      role: form.role,
      permissions: form.permissions,
    };
    // `active` doar la editare: la creare contul e activ oricum, iar câmpul
    // n-are ce să comute.
    if (account) payload.active = form.active;

    const message = await onSubmit(payload);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <Modal
      title={account ? "Editează administratorul" : "Administrator nou"}
      description={
        account
          ? "Parola se schimbă doar dacă completezi câmpul dedicat."
          : "Contul poate intra pe davo.md imediat după creare."
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={saving}>
            Anulează
          </SecondaryButton>
          <PrimaryButton type="submit" form={FORM_ID} loading={saving}>
            {account ? "Salvează" : "Creează contul"}
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
              placeholder="Ion Popescu"
            />
          </Field>
          <Field label="Email" hint="Cu el se autentifică pe davo.md.">
            <input
              type="email"
              value={form.email}
              onChange={(event) => update({ email: event.target.value })}
              className={inputCls}
              placeholder="ion@davo.md"
            />
          </Field>
        </div>

        <Field
          label={account ? "Parolă nouă" : "Parolă"}
          hint={
            account
              ? "Lasă gol ca să rămână parola actuală."
              : `Minimum ${MIN_PASSWORD_LENGTH} caractere.`
          }
        >
          <input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => update({ password: event.target.value })}
            className={inputCls}
            placeholder={account ? "••••••••" : ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Rol"
            hint={
              lockedRole
                ? "Nu te poți retrograda pe tine însuți."
                : "Rolul dă doar presetul de permisiuni de mai jos."
            }
          >
            <select
              value={form.role}
              disabled={lockedRole}
              onChange={(event) => update({ role: event.target.value as Role })}
              className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-50`}
            >
              <option value="admin">{ROLE_LABELS.admin}</option>
              <option value="admin2">{ROLE_LABELS.admin2}</option>
            </select>
          </Field>

          {account && (
            <Field
              label="Stare"
              hint={
                isSelf
                  ? "Nu te poți dezactiva pe tine însuți."
                  : "Contul dezactivat rămâne în listă, dar nu se mai poate autentifica."
              }
            >
              <label className="inline-flex items-center gap-2 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  disabled={isSelf}
                  onChange={(event) => update({ active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300 disabled:cursor-not-allowed"
                />
                Cont activ
              </label>
            </Field>
          )}
        </div>

        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Permisiuni
          </span>
          <PermissionPicker
            sections={sections}
            value={form.permissions}
            onChange={(permissions) => update({ permissions })}
            preset={preset}
          />
          {isSelf && (
            <p className="mt-2 text-xs text-slate-500">
              Secțiunea „Conturi & Acces” trebuie să rămână bifată pe propriul cont.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ───────────────────────── Resetare de parolă ─────────────────────────

/**
 * Formular separat de cel de editare: resetarea unei parole se face de obicei
 * în grabă, la telefon cu omul, iar un formular cu un singur scop nu riscă să
 * schimbe din greșeală rolul sau permisiunile.
 */
function PasswordModal({
  account,
  onClose,
  onSubmit,
}: {
  account: AdminAccount;
  onClose: () => void;
  onSubmit: (password: string) => Promise<string>;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Parola trebuie să aibă minimum ${MIN_PASSWORD_LENGTH} caractere`);
      return;
    }
    if (password !== confirmation) {
      setError("Cele două parole nu coincid");
      return;
    }

    setSaving(true);
    const message = await onSubmit(password);
    setSaving(false);
    if (message) setError(message);
  }

  return (
    <Modal
      title="Resetează parola"
      description={`Parola nouă pentru ${account.name} (${account.email}).`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={saving}>
            Anulează
          </SecondaryButton>
          <PrimaryButton type="submit" form="davo-password-form" loading={saving}>
            Schimbă parola
          </PrimaryButton>
        </>
      }
    >
      <form id="davo-password-form" className="grid gap-4" onSubmit={handleSubmit}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <Field label="Parolă nouă" hint={`Minimum ${MIN_PASSWORD_LENGTH} caractere.`}>
          <input
            autoFocus
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Confirmă parola">
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={inputCls}
          />
        </Field>

        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Parola veche devine inutilizabilă imediat. Comunic-o pe cea nouă înainte de a salva.
        </p>
      </form>
    </Modal>
  );
}
