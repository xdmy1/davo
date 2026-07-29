"use client";

/**
 * „Conturi & Acces” — panoul din care se administrează conturile celor trei
 * sisteme (admini davo.md, operatori rezervari, șoferi colete).
 *
 * Pagina ține doar poarta și taburile; fiecare tab își face singur cererile.
 * Tokenul de poartă stă exclusiv în state-ul de aici: nu ajunge în cookie, nu
 * ajunge în localStorage, deci un refresh sau o revenire în secțiune cere
 * PIN-ul din nou. Asta e chiar comportamentul cerut, nu o scăpare.
 */

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, Package, ScrollText, ShieldCheck, Users } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import GateScreen from "@/components/admin/accounts/GateScreen";
import AuditTab from "@/components/admin/accounts/AuditTab";
import ColeteTab from "@/components/admin/accounts/ColeteTab";
import DavoTab from "@/components/admin/accounts/DavoTab";
import GatePinTab from "@/components/admin/accounts/GatePinTab";
import RezervariTab from "@/components/admin/accounts/RezervariTab";
import {
  ErrorBanner,
  formatCountdown,
  PrimaryButton,
  SecondaryButton,
  SuccessBanner,
  TableSkeleton,
} from "@/components/admin/accounts/shared";
import { apiFetch, type AccountsMeta } from "@/lib/accountsClient";

const TABS = [
  { key: "davo", label: "Admini davo.md", icon: ShieldCheck, Component: DavoTab },
  { key: "rezervari", label: "Operatori rezervari", icon: Users, Component: RezervariTab },
  { key: "colete", label: "Șoferi colete", icon: Package, Component: ColeteTab },
  { key: "audit", label: "Jurnal", icon: ScrollText, Component: AuditTab },
  { key: "gate", label: "Parola secțiunii", icon: KeyRound, Component: GatePinTab },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Gate = { token: string; expiresAt: number };

export default function ConturiPage() {
  const [gate, setGate] = useState<Gate | null>(null);
  const [meta, setMeta] = useState<AccountsMeta | null>(null);
  const [metaError, setMetaError] = useState("");
  const [tab, setTab] = useState<TabKey>("davo");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lockNotice, setLockNotice] = useState("");

  /** Revenire la ecranul de PIN. `reason` explică de ce, când nu adminul a apăsat „Blochează”. */
  const lock = useCallback((reason = "") => {
    setGate(null);
    setMeta(null);
    setMetaError("");
    setError("");
    setSuccess("");
    setLockNotice(reason);
  }, []);

  const loadMeta = useCallback(
    async (token: string) => {
      setMetaError("");
      const result = await apiFetch<AccountsMeta>("/api/admin/accounts/meta", undefined, token);
      if (result.ok) {
        setMeta(result.data);
        return;
      }
      if (result.locked) {
        lock("Secțiunea s-a blocat între timp — introdu PIN-ul din nou.");
        return;
      }
      setMetaError(result.error);
    },
    [lock],
  );

  const unlocked = useCallback(
    (token: string, expiresAt: number) => {
      setGate({ token, expiresAt });
      setLockNotice("");
      void loadMeta(token);
    },
    [loadMeta],
  );

  /**
   * Identitatea funcției trebuie să rămână stabilă între randări: taburile își
   * leagă încărcarea listelor de ea, iar o funcție nouă la fiecare randare
   * le-ar trimite într-o buclă de cereri.
   */
  const handleLocked = useCallback(
    () => lock("Secțiunea s-a blocat — introdu PIN-ul din nou."),
    [lock],
  );

  useEffect(() => {
    if (!gate) return;
    // Reblocare la expirare, fără să aștepte primul 423: altfel adminul ar
    // completa un formular întreg ca să afle abia la salvare că poarta e închisă.
    const timer = window.setTimeout(
      () => lock("Deblocarea a expirat — introdu PIN-ul ca să continui."),
      Math.max(0, gate.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [gate, lock]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  if (!gate) {
    return (
      <div>
        {lockNotice && (
          <p className="mx-auto max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            {lockNotice}
          </p>
        )}
        <GateScreen onUnlocked={unlocked} />
      </div>
    );
  }

  const active = TABS.find((item) => item.key === tab) ?? TABS[0];
  const ActiveTab = active.Component;

  return (
    <div>
      <PageHeader
        title="Conturi & Acces"
        subtitle="Conturi și permisiuni pentru davo.md, panoul de operatori și aplicația de colete"
        actions={
          <>
            <GateCountdown expiresAt={gate.expiresAt} />
            <SecondaryButton icon={Lock} onClick={() => lock()}>
              Blochează
            </SecondaryButton>
          </>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                // Bannerele aparțin tabului care le-a produs; altfel un mesaj
                // de eroare de la „Admini” ar rămâne agățat peste „Jurnal”.
                setError("");
                setSuccess("");
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-orange-50 text-orange-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-orange-500" : "text-slate-400"}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <SuccessBanner message={success} onDismiss={() => setSuccess("")} />

      {metaError ? (
        <div>
          <ErrorBanner message={metaError} />
          <PrimaryButton onClick={() => void loadMeta(gate.token)}>Încearcă din nou</PrimaryButton>
        </div>
      ) : !meta ? (
        // Taburile primesc `meta` deja încărcat: catalogul de secțiuni vine de
        // pe server, deci n-are sens ca fiecare tab să trateze lipsa lui.
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <ActiveTab
          token={gate.token}
          meta={meta}
          onLocked={handleLocked}
          onError={setError}
          onSuccess={setSuccess}
        />
      )}
    </div>
  );
}

/**
 * Contorul până la reblocare, cu propriul interval.
 *
 * Stă într-un component separat tocmai ca secunda care trece să nu re-randeze
 * tabul activ — altfel un formular deschis s-ar reconstrui o dată pe secundă.
 */
function GateCountdown({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"
      title="Timpul rămas până când secțiunea se blochează singură"
    >
      <Lock className="h-3.5 w-3.5 text-slate-400" />
      <span className="font-mono">{formatCountdown((expiresAt - now) / 1000)}</span>
    </span>
  );
}
