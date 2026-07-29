"use client";

/**
 * Ecranul de poartă al secțiunii „Conturi & Acces”.
 *
 * Sesiunea de admin nu e de ajuns aici: din panoul ăsta se pot crea conturi
 * pentru toate cele trei sisteme, deci se mai cere un PIN, la fiecare intrare.
 * Tokenul primit rămâne în state-ul paginii, niciodată în cookie sau
 * localStorage — un laptop lăsat deschis pe alt tab nu trebuie să dea acces
 * după un refresh.
 */

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { apiFetch, type UnlockResponse } from "@/lib/accountsClient";
import { ErrorBanner, formatCountdown, PrimaryButton, inputCls } from "./shared";

export default function GateScreen({
  onUnlocked,
}: {
  /** `expiresAt` e epoch ms: pagina afișează cât mai ține deblocarea și se reblochează singură. */
  onUnlocked: (token: string, expiresAt: number) => void;
}) {
  const [pin, setPin] = useState("");
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const blockedSeconds = blockedUntil ? Math.max(0, (blockedUntil - now) / 1000) : 0;
  const blocked = blockedSeconds > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!blockedUntil) return;
    // Contorul merge doar cât ține blocajul; fără intervalul ăsta, adminul ar
    // vedea un număr înghețat și n-ar ști când poate reîncerca.
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [blockedUntil]);

  useEffect(() => {
    if (blockedUntil && blockedUntil <= now) {
      setBlockedUntil(null);
      setError("");
      inputRef.current?.focus();
    }
  }, [blockedUntil, now]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || blocked || !pin) return;

    setSubmitting(true);
    setError("");
    // Fără token: `/unlock` e singura rută care nu cere poarta, fiindcă abia
    // urmează s-o deschidă.
    const result = await apiFetch<UnlockResponse>("/api/admin/accounts/unlock", {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
    setSubmitting(false);

    if (result.ok) {
      onUnlocked(result.data.token, result.data.expiresAt);
      return;
    }

    if (result.retryAfter) {
      setNow(Date.now());
      setBlockedUntil(Date.now() + result.retryAfter * 1000);
    }
    setError(result.error);
    // PIN-ul greșit se șterge: reîncercarea pornește de la zero, nu din
    // corectarea unei cifre.
    setPin("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Secțiune protejată</h1>
          <p className="mt-1 text-sm text-slate-500">
            Introdu PIN-ul secțiunii ca să administrezi conturile celor trei sisteme.
          </p>
        </div>

        <form className="mt-6" onSubmit={submit}>
          <div className="relative">
            <input
              ref={inputRef}
              type={reveal ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              placeholder="••••"
              aria-label="PIN-ul secțiunii"
              value={pin}
              disabled={blocked || submitting}
              // Doar cifre: PIN-ul e numeric, iar o literă strecurată ar
              // produce „PIN incorect” fără explicație.
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              className={`${inputCls} py-3 pr-11 text-center text-lg tracking-[0.5em] disabled:bg-slate-50`}
            />
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              aria-label={reveal ? "Ascunde PIN-ul" : "Arată PIN-ul"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>

          {blocked && (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              Reîncearcă peste{" "}
              <span className="font-mono font-semibold">{formatCountdown(blockedSeconds)}</span>
            </p>
          )}

          <PrimaryButton
            type="submit"
            className="w-full"
            loading={submitting}
            disabled={blocked || pin.length === 0}
          >
            Deblochează
          </PrimaryButton>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          PIN-ul se cere la fiecare intrare în secțiune — nu e ținut minte de browser.
        </p>
      </div>
    </div>
  );
}
