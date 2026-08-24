"use client";

import { useEffect, useState } from "react";
import { Mail, Send, RefreshCw, AlertCircle, CheckCircle, Clock, Calendar } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import Badge from "@/components/admin/Badge";
import EmptyState from "@/components/admin/EmptyState";
import type { MockEmail } from "@/lib/adminMock";
import { emailStatusMeta, emailTypeLabel } from "@/lib/adminLabels";

const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type Tab = "log" | "templates";

// Catalogul emailurilor REALE (lib/emailTemplates.ts) în ordinea în care le
// primește pasagerul. „Previzualizează" deschide exact HTML-ul trimis prin
// Resend, randat cu date de exemplu (/api/admin/emails/preview).
const templates: { previewType: string; label: string; subject: string; trigger: string }[] = [
  {
    previewType: "confirmation",
    label: "1 · Confirmare rezervare",
    subject: "Rezervare confirmată — DAVO {nr}",
    trigger: "Imediat după rezervare (site) sau la trecerea pe „Confirmată” (admin).",
  },
  {
    previewType: "confirmation_parcel",
    label: "1 · Confirmare colet",
    subject: "Colet înregistrat — DAVO {nr}",
    trigger: "Imediat după înregistrarea coletului. Fără reminder — ridicarea se stabilește telefonic.",
  },
  {
    previewType: "reminder_24h",
    label: "2 · Reminder cu o zi înainte",
    subject: "Mâine pleci cu DAVO — confirmă-ne că vii",
    trigger: "Cu o zi înainte de plecare, la 08:00 ora Moldovei (trimis efectiv la rularea cronului de dimineață).",
  },
  {
    previewType: "bus_change",
    label: "(opțional) Autocar schimbat",
    subject: "Autocar schimbat — {nr}",
    trigger: "Manual, din Curse → schimbă autocarul, dacă bifezi „anunță pasagerii”.",
  },
  {
    previewType: "cancellation",
    label: "(opțional) Anulare rezervare",
    subject: "Rezervare {nr} anulată",
    trigger: "Când rezervarea trece pe „Anulată” în admin.",
  },
  {
    previewType: "review_request",
    label: "3 · Cerere recenzie / feedback",
    subject: "Cum a fost călătoria cu DAVO? Lasă o recenzie ⭐",
    trigger: "La 2 zile după SOSIREA la destinație (plecare + durata cursei din programul țării + 48h).",
  },
  {
    previewType: "admin_notification",
    label: "Intern · Notificare admin",
    subject: "Rezervare nouă — {nr}",
    trigger: "Către adresa de admin, imediat după fiecare rezervare de pe site.",
  },
];

type EmailStats = { sent: number; failed: number; queued: number; scheduled: number };

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>("log");
  const [jobs, setJobs] = useState<MockEmail[]>([]);
  const [stats, setStats] = useState<EmailStats>({ sent: 0, failed: 0, queued: 0, scheduled: 0 });
  const [loading, setLoading] = useState(true);

  const [running, setRunning] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/emails");
      const data = await res.json();
      if (data?.success) {
        setJobs(data.jobs);
        setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }

  async function runQueue() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/emails/run", { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        alert(`Procesate: ${data.processed} · trimise: ${data.sent} · eșuate: ${data.failed} · reîncercate: ${data.retried}`);
        load();
      } else {
        alert(data?.error ?? "Eroare la rulare");
      }
    } finally {
      setRunning(false);
    }
  }

  async function retryFailed() {
    if (!confirm("Reîncerci toate emailurile eșuate?")) return;
    setRetryingFailed(true);
    try {
      const res = await fetch("/api/admin/emails/retry-failed", { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        alert(`Reîncercate: ${data.reset} · trimise acum: ${data.sent} · încă eșuate: ${data.failed}`);
        load();
      } else {
        alert(data?.error ?? "Eroare la reîncercare");
      }
    } finally {
      setRetryingFailed(false);
    }
  }

  async function resend(id: string) {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/emails/${id}`, { method: "POST" });
      const data = await res.json();
      if (data?.success) {
        alert("Email trimis.");
        load();
      } else {
        alert(data?.error ?? "Trimiterea a eșuat");
      }
    } finally {
      setResendingId(null);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Emailuri automate"
        subtitle="Reminder-uri, confirmări și coada de trimitere (Resend + EmailJob)"
        actions={
          <>
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" /> Actualizare
            </button>
            {stats.failed > 0 && (
              <button
                onClick={retryFailed}
                disabled={retryingFailed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
              >
                <AlertCircle className="h-3.5 w-3.5" /> {retryingFailed ? "Reîncerc…" : `Reîncearcă eșuate (${stats.failed})`}
              </button>
            )}
            <button
              onClick={runQueue}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" /> {running ? "Procesez…" : "Rulează acum"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Trimise" value={stats.sent} icon={CheckCircle} tone="green" />
        <StatCard label="În coadă" value={stats.queued} icon={Clock} tone="orange" />
        <StatCard label="Programate" value={stats.scheduled} icon={Calendar} tone="blue" />
        <StatCard label="Eșuate" value={stats.failed} icon={AlertCircle} tone="red" hint="Necesită intervenție manuală" />
      </div>

      <div className="mt-6 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {(["log", "templates"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t === "log" ? "Coadă + Log" : "Template-uri"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "log" ? (
          loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Niciun email în coadă"
              description="Email-urile automate apar aici după confirmarea primei rezervări (confirmation + reminder_24h)."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Tip</th>
                    <th className="px-5 py-3 text-left">Destinatar</th>
                    <th className="px-5 py-3 text-left">Subiect</th>
                    <th className="px-5 py-3 text-left">Trimis / Programat</th>
                    <th className="px-5 py-3 text-left">Rezervare</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((e) => {
                    // Fallback defensiv: orice status necunoscut nu mai crapă pagina.
                    const meta = emailStatusMeta[e.status] ?? { label: e.status, variant: "slate" as const };
                    return (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-xs font-semibold text-slate-600">{emailTypeLabel[e.type]}</td>
                        <td className="px-5 py-3 text-slate-700">{e.to}</td>
                        <td className="px-5 py-3 text-slate-900 truncate max-w-[260px]">{e.subject}</td>
                        <td className="px-5 py-3 text-slate-600">{dateFmt.format(new Date(e.sentAt ?? e.sendAt))}</td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-700">{e.bookingNumber}</td>
                        <td className="px-5 py-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {e.error && <div className="mt-1 text-[11px] text-red-600 truncate max-w-[200px]">{e.error}</div>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => resend(e.id)}
                              disabled={resendingId === e.id}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-orange-600 disabled:opacity-50"
                              title={e.status === "sent" ? "Retrimite" : e.status === "failed" ? "Reîncearcă" : "Trimite acum"}
                            >
                              {resendingId === e.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <>
            <p className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
              Astea sunt emailurile reale trimise prin Resend, în ordinea în care le primește un pasager.
              „Previzualizează” deschide HTML-ul exact, cu date de exemplu. Pentru o rezervare anume:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">/api/admin/bookings/DAVO-…/preview-email</code>
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.map((tpl) => (
                <article key={tpl.previewType} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{tpl.label}</h3>
                        <Badge variant="slate">{tpl.previewType}</Badge>
                      </div>
                      <p className="mt-1 text-xs font-mono text-slate-600">{tpl.subject}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{tpl.trigger}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <a
                      href={`/api/admin/emails/preview?type=${tpl.previewType}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Previzualizează
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
