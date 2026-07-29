"use client";

/**
 * Piesele comune ale secțiunii „Conturi & Acces”.
 *
 * Cele trei taburi de conturi fac același lucru pe trei sisteme diferite:
 * tabel, modal de creare/editare, confirmare la ștergere, selector de
 * permisiuni. Fără piesele astea în comun, fiecare tab ar inventa altă
 * confirmare de ștergere și alt selector de permisiuni — iar diferențele de
 * comportament între ele ar fi exact genul de lucru care duce la un cont șters
 * din greșeală.
 */

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import Badge from "@/components/admin/Badge";
import { cn } from "@/lib/utils";
import type { SectionOption } from "@/lib/accountsClient";

export { default as EmptyState } from "@/components/admin/EmptyState";

/** Identic cu `inputCls` din celelalte pagini de admin — aceleași câmpuri, același contur. */
export const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200";

// ───────────────────────────── Formulare ─────────────────────────────

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  /** Explicație scurtă sub câmp — folosită pentru reguli care altfel se află doar din eroarea serverului. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

// ───────────────────────────── Butoane ─────────────────────────────

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
};

function ButtonBase({
  className,
  loading = false,
  icon: Icon,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // Un buton în lucru rămâne apăsabil doar în aparență: dublu-click pe
      // „Salvează” ar trimite două cereri de creare.
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        Icon && <Icon className="h-3.5 w-3.5" />
      )}
      {children}
    </button>
  );
}

// `cn` peste clasele variantei, nu după ele: un `className="w-full"` primit de
// la apelant trebuie să se adauge, nu să șteargă culoarea butonului.
export function PrimaryButton({ className, ...rest }: ButtonProps) {
  return (
    <ButtonBase
      className={cn("bg-orange-500 text-white shadow-sm hover:bg-orange-600", className)}
      {...rest}
    />
  );
}

export function SecondaryButton({ className, ...rest }: ButtonProps) {
  return (
    <ButtonBase
      className={cn(
        "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
        className,
      )}
      {...rest}
    />
  );
}

export function DangerButton({ className, ...rest }: ButtonProps) {
  return (
    <ButtonBase
      className={cn("bg-red-600 text-white shadow-sm hover:bg-red-700", className)}
      {...rest}
    />
  );
}

/** Acțiune de rând (editare, activare, ștergere). `label` e și tooltip, și text pentru cititoarele de ecran. */
export function IconButton({
  icon: Icon,
  label,
  tone = "slate",
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "slate" | "danger";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === "danger"
          ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
          : "text-slate-500 hover:bg-slate-100 hover:text-orange-600"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ───────────────────────────── Stare ─────────────────────────────

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "green" : "slate"}>{active ? "Activ" : "Inactiv"}</Badge>;
}

// ───────────────────────────── Bannere ─────────────────────────────

function BannerShell({
  tone,
  icon: Icon,
  message,
  onDismiss,
}: {
  tone: "error" | "success";
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  onDismiss?: () => void;
}) {
  // Mesajul gol e starea normală „nimic de arătat”, ca apelantul să nu fie
  // nevoit să scrie o condiție la fiecare folosire.
  if (!message) return null;

  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1 whitespace-pre-line">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Închide mesajul"
          className="rounded p-0.5 opacity-60 transition hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return <BannerShell tone="error" icon={AlertCircle} message={message} onDismiss={onDismiss} />;
}

export function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <BannerShell tone="success" icon={CheckCircle2} message={message} onDismiss={onDismiss} />
  );
}

// ───────────────────────────── Încărcare ─────────────────────────────

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
        >
          {Array.from({ length: cols }).map((__, colIndex) => (
            <div
              key={colIndex}
              // Prima coloană e mai lată: schița trebuie să semene cu tabelul
              // care urmează, altfel conținutul „sare” la încărcare.
              className={`h-3 animate-pulse rounded bg-slate-100 ${
                colIndex === 0 ? "w-1/3" : "flex-1"
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────── Modale ─────────────────────────────

const MODAL_WIDTHS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export function Modal({
  title,
  description,
  size = "md",
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: string;
  size?: keyof typeof MODAL_WIDTHS;
  onClose: () => void;
  /** Zona de butoane, lipită sub conținut; lipsește când formularul își pune singur butoanele. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    // Fundalul nu trebuie să deruleze sub modal: pe mobil altfel se pierde
    // poziția din tabel când se închide.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4"
      // Doar clicul pe fundal închide; unul început în interior și terminat pe
      // fundal (selecție de text trasă afară) nu trebuie să piardă formularul.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full ${MODAL_WIDTHS[size]} rounded-2xl bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confirmare pentru operațiile ireversibile. `consequences` e obligatoriu prin
 * convenție: o ștergere de cont trebuie să spună exact ce se pierde (rezervări
 * atribuite, colete, istoric), nu doar „ești sigur?”.
 */
export function ConfirmDialog({
  title,
  message,
  consequences,
  confirmLabel = "Șterge definitiv",
  cancelLabel = "Anulează",
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={loading ? () => {} : onCancel}
      footer={
        <>
          <SecondaryButton onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </SecondaryButton>
          <DangerButton onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </DangerButton>
        </>
      }
    >
      <p className="text-sm text-slate-700">{message}</p>
      {consequences && consequences.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {consequences.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ───────────────────────── Selectorul de permisiuni ─────────────────────────

/**
 * Bifează secțiunile la care are acces contul.
 *
 * `value` e lista brută salvată în baza de date, iar lista goală înseamnă
 * „folosește presetul rolului” — nu „fără nicio secțiune”. De aceea modul e o
 * stare separată: altfel, debifarea ultimei căsuțe ar sări înapoi în preset
 * fără ca adminul să înțeleagă de ce.
 *
 * Când se schimbă contul editat, dă-i componentei un `key` diferit (id-ul
 * contului): modul se recalculează la montare, nu la fiecare `value` nou.
 */
export function PermissionPicker({
  sections,
  value,
  onChange,
  preset,
  presetLabel = "Folosește presetul rolului",
  disabled = false,
}: {
  sections: SectionOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Cheile pe care le implică rolul curent — afișate bifate, dar inactive, cât timp presetul e activ. */
  preset: string[];
  presetLabel?: string;
  disabled?: boolean;
}) {
  const [usePreset, setUsePreset] = useState(value.length === 0);

  const shown = usePreset ? preset : value;
  const locked = disabled || usePreset;

  const groups: { group: string; items: SectionOption[] }[] = [];
  for (const section of sections) {
    const existing = groups.find((g) => g.group === section.group);
    if (existing) existing.items.push(section);
    else groups.push({ group: section.group, items: [section] });
  }

  function toggle(key: string) {
    const next = value.includes(key)
      ? value.filter((k) => k !== key)
      : // Ordinea din catalog, nu ordinea bifării: lista salvată rămâne
        // comparabilă între conturi.
        sections.filter((s) => s.key === key || value.includes(s.key)).map((s) => s.key);
    onChange(next);
  }

  function switchToPreset(next: boolean) {
    setUsePreset(next);
    // Trecerea la selecție proprie pornește de la preset: adminul ajustează un
    // set care funcționează, nu construiește unul de la zero.
    onChange(next ? [] : preset);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={usePreset}
            disabled={disabled}
            onChange={(event) => switchToPreset(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
          />
          {presetLabel}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={locked}
            onClick={() => onChange(sections.map((s) => s.key))}
            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tot
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => onChange([])}
            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Nimic
          </button>
        </div>
      </div>

      <div className={`mt-3 space-y-4 ${locked ? "opacity-60" : ""}`}>
        {groups.map(({ group, items }) => (
          <div key={group}>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {group}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {items.map((section) => (
                <label
                  key={section.key}
                  className={`flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700 ${
                    locked ? "" : "cursor-pointer hover:bg-orange-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={shown.includes(section.key)}
                    disabled={locked}
                    onChange={() => toggle(section.key)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                  />
                  {section.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!usePreset && value.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Nicio secțiune bifată — la salvare contul primește tot presetul rolului. Bifează cel
          puțin una ca selecția să conteze.
        </p>
      )}
    </div>
  );
}

// ───────────────────────────── Formatare ─────────────────────────────

const dateTimeFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Dată+oră pentru ultima autentificare, creare și jurnal. Lipsa e „—”, nu o dată falsă. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFmt.format(date);
}

/** Secunde → „mm:ss” pentru contorul de blocare și cel de expirare a porții. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
