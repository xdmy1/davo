"use client";

/**
 * Tabul „Parola secțiunii” — schimbarea PIN-ului cerut la intrarea în
 * „Conturi & Acces”.
 *
 * PIN-ul curent se cere chiar dacă utilizatorul e deja înăuntru: deblocarea
 * ține până la 30 de minute, iar un laptop lăsat deschis nu trebuie să permită
 * schimbarea parolei care apără toate conturile. Serverul verifică oricum
 * același lucru — validările de aici doar scutesc drumul dus-întors și, la a
 * cincea greșeală, blocajul anti brute-force.
 */

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { apiFetch, type AccountsTabProps } from "@/lib/accountsClient";
import {
  ConfirmDialog,
  ErrorBanner,
  Field,
  PrimaryButton,
  SecondaryButton,
  SuccessBanner,
  formatCountdown,
  inputCls,
} from "./shared";

const API = "/api/admin/accounts/gate-pin";

// Aceeași regulă ca pe server (`/^\d{4,}$/`): minimum 4 cifre, fără maxim.
const PIN_RE = /^\d{4,}$/;

type FormState = { currentPin: string; newPin: string; confirmPin: string };

const EMPTY: FormState = { currentPin: "", newPin: "", confirmPin: "" };

/** Primul motiv pentru care formularul nu poate pleca, sau „” dacă e în regulă. */
function validate(form: FormState): string {
  if (!form.currentPin) return "Introdu PIN-ul curent al secțiunii";
  if (!PIN_RE.test(form.newPin)) return "PIN-ul nou trebuie să conțină minimum 4 cifre";
  if (form.confirmPin !== form.newPin) {
    return "Confirmarea nu coincide cu PIN-ul nou — retastează-l în ambele câmpuri";
  }
  if (form.newPin === form.currentPin) return "PIN-ul nou trebuie să fie diferit de cel curent";
  return "";
}

/** Câmp de PIN cu buton de dezvăluire — greșelile de tastare aici blochează secțiunea pentru toți. */
function PinField({
  label,
  hint,
  value,
  placeholder,
  autoFocus,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [reveal, setReveal] = useState(false);

  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          // Doar cifre: o literă strecurată ar produce „PIN incorect” fără să se
          // vadă de ce, fiindcă textul e mascat.
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          className={`${inputCls} pr-11 font-mono tracking-[0.3em] disabled:bg-slate-50`}
        />
        <button
          type="button"
          onClick={() => setReveal((current) => !current)}
          aria-label={reveal ? `Ascunde ${label}` : `Arată ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

// ───────────────────────────── Tabul ─────────────────────────────

export default function GatePinTab({ token, onLocked, onSuccess }: AccountsTabProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const blockedSeconds = blockedUntil ? Math.max(0, (blockedUntil - now) / 1000) : 0;
  const blocked = blockedSeconds > 0;

  useEffect(() => {
    if (!blockedUntil) return;
    // Contorul merge doar cât ține blocajul; fără el, adminul ar vedea un număr
    // înghețat și n-ar ști când poate reîncerca. Tot aici se și oprește, ca
    // intervalul să nu rămână pornit după ce blocajul a trecut.
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (blockedUntil <= current) {
        setBlockedUntil(null);
        setError("");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [blockedUntil]);

  function set(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  function requestChange(event: React.FormEvent) {
    event.preventDefault();
    if (saving || blocked) return;

    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    // Confirmarea nu e ceremonie: un PIN greșit aici încuie secțiunea pentru
    // toți adminii, iar cel vechi nu se mai poate recupera din UI.
    setConfirming(true);
  }

  async function submit() {
    setSaving(true);
    setError("");
    setSuccess("");

    const result = await apiFetch<Record<string, unknown>>(
      API,
      {
        method: "POST",
        // Confirmarea pleacă și ea: serverul o verifică din nou, ca o greșeală
        // de tastare să nu treacă nici dacă validarea din browser e ocolită.
        body: JSON.stringify({
          currentPin: form.currentPin,
          newPin: form.newPin,
          confirmPin: form.confirmPin,
        }),
      },
      token,
    );

    setSaving(false);
    setConfirming(false);

    if (!result.ok) {
      if (result.locked) {
        onLocked();
        return;
      }
      if (result.retryAfter) {
        setNow(Date.now());
        setBlockedUntil(Date.now() + result.retryAfter * 1000);
      }
      setError(result.error);
      // Doar PIN-ul curent se golește: cel nou rămâne scris, fiindcă eroarea
      // aproape întotdeauna vine de la cel vechi.
      setForm((current) => ({ ...current, currentPin: "" }));
      return;
    }

    setForm(EMPTY);
    setSuccess(
      "PIN-ul secțiunii a fost schimbat. Deblocarea curentă rămâne validă, dar la următoarea intrare — a ta sau a altui admin — se cere PIN-ul nou.",
    );
    onSuccess("PIN-ul secțiunii a fost schimbat");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Schimbă PIN-ul secțiunii</h3>
            <p className="mt-1 text-sm text-slate-500">
              PIN-ul e comun tuturor adminilor cu acces la „Conturi & Acces”. Nu e parola contului
              tău de davo.md.
            </p>
          </div>
        </div>

        <form className="mt-6 grid max-w-md gap-4" onSubmit={requestChange}>
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          <SuccessBanner message={success} onDismiss={() => setSuccess("")} />

          {blocked && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Prea multe încercări greșite. Reîncearcă peste{" "}
              <span className="font-mono font-semibold">{formatCountdown(blockedSeconds)}</span>
            </p>
          )}

          <PinField
            label="PIN-ul curent"
            hint="Se cere chiar dacă secțiunea e deja deblocată."
            value={form.currentPin}
            placeholder="••••"
            autoFocus
            disabled={saving || blocked}
            onChange={(value) => set("currentPin", value)}
          />

          <PinField
            label="PIN nou"
            hint="Minimum 4 cifre. Fără litere sau simboluri."
            value={form.newPin}
            placeholder="••••"
            disabled={saving || blocked}
            onChange={(value) => set("newPin", value)}
          />

          <PinField
            label="Confirmă PIN-ul nou"
            hint="Retastează-l — nu îl copia, ca o greșeală să se vadă acum, nu la următoarea intrare."
            value={form.confirmPin}
            placeholder="••••"
            disabled={saving || blocked}
            onChange={(value) => set("confirmPin", value)}
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <PrimaryButton type="submit" icon={ShieldCheck} loading={saving} disabled={blocked}>
              Schimbă PIN-ul
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setForm(EMPTY);
                setError("");
                setSuccess("");
              }}
              disabled={saving}
            >
              Golește câmpurile
            </SecondaryButton>
          </div>
        </form>
      </div>

      <aside className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4" />
            PIN-ul se cere la fiecare intrare
          </div>
          <p className="mt-2">
            Deblocarea trăiește doar în pagina deschisă acum. Orice reîncărcare, ieșire din
            secțiune sau expirare a celor 30 de minute cere PIN-ul din nou — nu e ținut minte de
            browser și nu se salvează în cookie.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          <div className="font-semibold text-slate-800">Înainte să-l schimbi</div>
          <ul className="mt-2 space-y-2">
            <li className="flex gap-2">
              <span aria-hidden className="text-slate-400">
                •
              </span>
              <span>
                Anunță ceilalți admini: din momentul salvării, PIN-ul vechi nu mai deschide
                secțiunea pentru nimeni.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-slate-400">
                •
              </span>
              <span>
                PIN-ul nu se poate recupera din panou. Dacă se pierde, se resetează din server cu{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  npm run accounts:pin -- &lt;pin&gt;
                </code>
                .
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-slate-400">
                •
              </span>
              <span>
                După 5 încercări greșite, secțiunea se blochează 15 minute pentru contul și
                adresa ta IP.
              </span>
            </li>
          </ul>
        </div>
      </aside>

      {confirming && (
        <ConfirmDialog
          title="Confirmi schimbarea PIN-ului?"
          message="PIN-ul secțiunii „Conturi & Acces” se înlocuiește imediat pentru toți adminii."
          consequences={[
            "PIN-ul vechi nu mai deschide secțiunea pentru nimeni.",
            "Ceilalți admini trebuie anunțați — altfel rămân blocați afară.",
            "Nu există recuperare din panou; resetarea se face doar de pe server.",
          ]}
          confirmLabel="Da, schimbă PIN-ul"
          cancelLabel="Anulează"
          loading={saving}
          onConfirm={() => void submit()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
