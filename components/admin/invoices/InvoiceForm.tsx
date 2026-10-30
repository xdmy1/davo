"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { INVOICE_BANK_ACCOUNTS, defaultBankAccountFor } from "@/lib/invoiceBanks";
import {
  INVOICE_CURRENCIES,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABEL,
  INVOICE_TYPE_LABEL,
  formatMoney,
  invoiceTotals,
  todayChisinau,
  type InvoiceStatus,
  type InvoiceType,
} from "@/lib/invoices";
import type { InvoiceDTO } from "@/lib/invoiceStore";

type ItemRow = { description: string; taxRate: string; quantity: string; rate: string };

type FormState = {
  type: InvoiceType;
  number: string;
  issueDate: string;
  dueDate: string;
  poNumber: string;
  currency: string;
  bankAccountId: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientCountry: string;
  clientPostcode: string;
  clientVat: string;
  clientEmail: string;
  items: ItemRow[];
  showTotalInWords: boolean;
  notes: string;
  status: InvoiceStatus;
  amountPaid: string;
  paidAt: string;
};

const emptyItem: ItemRow = { description: "", taxRate: "0", quantity: "1", rate: "" };

function fromDTO(d: InvoiceDTO): FormState {
  return {
    type: d.type,
    number: d.number,
    issueDate: d.issueDate,
    dueDate: d.dueDate ?? "",
    poNumber: d.poNumber ?? "",
    currency: d.currency,
    bankAccountId: d.bank.id,
    clientName: d.clientName,
    clientAddress: d.clientAddress,
    clientCity: d.clientCity ?? "",
    clientCountry: d.clientCountry ?? "",
    clientPostcode: d.clientPostcode ?? "",
    clientVat: d.clientVat ?? "",
    clientEmail: d.clientEmail ?? "",
    items: d.items.map((i) => ({
      description: i.description,
      taxRate: String(i.taxRate),
      quantity: String(i.quantity),
      rate: String(i.rate),
    })),
    showTotalInWords: d.showTotalInWords,
    notes: d.notes ?? "",
    status: d.status,
    amountPaid: d.amountPaid == null ? "" : String(d.amountPaid),
    paidAt: d.paidAt ?? "",
  };
}

function blank(type: InvoiceType): FormState {
  return {
    type,
    number: "",
    issueDate: todayChisinau(),
    dueDate: "",
    poNumber: "",
    currency: "EUR",
    bankAccountId: defaultBankAccountFor("EUR")?.id ?? "",
    clientName: "",
    clientAddress: "",
    clientCity: "",
    clientCountry: "",
    clientPostcode: "",
    clientVat: "",
    clientEmail: "",
    items: [{ ...emptyItem }],
    showTotalInWords: type === "invoice",
    notes: "",
    status: "draft",
    amountPaid: "",
    paidAt: "",
  };
}

const input =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#6539C0] focus:outline-none focus:ring-2 focus:ring-[#6539C0]/20";
const label = "mb-1 block text-xs font-semibold text-slate-600";
const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

const toNum = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function InvoiceForm({ id, initialType = "invoice" }: { id?: string; initialType?: InvoiceType }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(id ? null : blank(initialType));
  const [nextNumbers, setNextNumbers] = useState<Record<InvoiceType, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (id) {
          const r = await fetch(`/api/admin/invoices/${id}`).then((x) => x.json());
          if (!r.success) throw new Error(r.error);
          if (!cancelled) setForm(fromDTO(r.invoice));
        } else {
          const r = await fetch(`/api/admin/invoices?only=next`).then((x) => x.json());
          if (!r.success) throw new Error(r.error);
          if (cancelled) return;
          setNextNumbers(r.nextNumbers);
          setForm((f) => (f && !f.number ? { ...f, number: r.nextNumbers[f.type] } : f));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Eroare la încărcare");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!form) {
    return <p className="text-sm text-slate-500">{error ?? "Se încarcă…"}</p>;
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setForm((f) => (f ? { ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) } : f));

  const totals = invoiceTotals(
    form.items.map((i) => ({ description: i.description, taxRate: toNum(i.taxRate), quantity: toNum(i.quantity), rate: toNum(i.rate) })),
    form.amountPaid === "" ? null : toNum(form.amountPaid),
    form.status,
  );

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(id ? `/api/admin/invoices/${id}` : "/api/admin/invoices", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Eroare la salvare");
      router.push(`/admin/facturi/${data.invoice.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la salvare");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={id ? `Editează ${INVOICE_TYPE_LABEL[form.type].toLowerCase()} ${form.number}` : "Document nou"}
        actions={
          <Link
            href={id ? `/admin/facturi/${id}` : "/admin/facturi"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Înapoi
          </Link>
        }
      />

      <div className="space-y-4">
        <section className={card}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className={label}>Tip</span>
              <select
                className={input}
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as InvoiceType;
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          type,
                          // Numărul propus urmează seria; unul scris de mână rămâne.
                          number: !id && nextNumbers && f.number === nextNumbers[f.type] ? nextNumbers[type] : f.number,
                          showTotalInWords: id ? f.showTotalInWords : type === "invoice",
                        }
                      : f,
                  );
                }}
              >
                <option value="proforma">Proformă (Proforma Invoice)</option>
                <option value="invoice">Factură (Invoice)</option>
              </select>
            </div>
            <div>
              <span className={label}>Număr</span>
              <input className={input} value={form.number} onChange={(e) => set("number", e.target.value.toUpperCase())} />
            </div>
            <div>
              <span className={label}>PO Number (opțional)</span>
              <input className={input} value={form.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
            </div>
            <div>
              <span className={label}>Data documentului</span>
              <input type="date" className={input} value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </div>
            <div>
              <span className={label}>Scadența (Due Date)</span>
              <input type="date" className={input} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
            <div>
              <span className={label}>Valută</span>
              <select
                className={input}
                value={form.currency}
                onChange={(e) => {
                  const currency = e.target.value;
                  setForm((f) =>
                    f ? { ...f, currency, bankAccountId: defaultBankAccountFor(currency)?.id ?? f.bankAccountId } : f,
                  );
                }}
              >
                {INVOICE_CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <span className={label}>Cont bancar (Bank Details)</span>
              <select className={input} value={form.bankAccountId} onChange={(e) => set("bankAccountId", e.target.value)}>
                <option value="">— alege contul —</option>
                {INVOICE_BANK_ACCOUNTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.iban}
                  </option>
                ))}
              </select>
              {!defaultBankAccountFor(form.currency) && (
                <p className="mt-1 text-xs text-amber-700">Nu avem cont în {form.currency}; alege explicit contul tipărit pe document.</p>
              )}
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-3 text-sm font-bold text-slate-900">Client (Billed To)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className={label}>Denumire</span>
              <input className={input} value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Adresă</span>
              <textarea rows={2} className={input} value={form.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} />
            </div>
            <div>
              <span className={label}>Oraș</span>
              <input className={input} value={form.clientCity} onChange={(e) => set("clientCity", e.target.value)} />
            </div>
            <div>
              <span className={label}>Țară (în engleză, ex. United Kingdom (UK))</span>
              <input className={input} value={form.clientCountry} onChange={(e) => set("clientCountry", e.target.value)} />
            </div>
            <div>
              <span className={label}>Cod poștal</span>
              <input className={input} value={form.clientPostcode} onChange={(e) => set("clientPostcode", e.target.value)} />
            </div>
            <div>
              <span className={label}>VAT Number (opțional)</span>
              <input className={input} value={form.clientVat} onChange={(e) => set("clientVat", e.target.value)} />
            </div>
            <div>
              <span className={label}>Email (opțional, nu se tipărește)</span>
              <input type="email" className={input} value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} />
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-3 text-sm font-bold text-slate-900">Poziții</h2>
          <div className="space-y-3">
            {form.items.map((it, i) => (
              <div key={i} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_90px_90px_120px_120px_auto]">
                <div>
                  <span className={label}>Descriere</span>
                  <textarea rows={2} className={input} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                </div>
                <div>
                  <span className={label}>TVA %</span>
                  <input inputMode="decimal" className={input} value={it.taxRate} onChange={(e) => setItem(i, { taxRate: e.target.value })} />
                </div>
                <div>
                  <span className={label}>Cantitate</span>
                  <input inputMode="decimal" className={input} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                </div>
                <div>
                  <span className={label}>Preț (Rate)</span>
                  <input inputMode="decimal" className={input} value={it.rate} onChange={(e) => setItem(i, { rate: e.target.value })} />
                </div>
                <div>
                  <span className={label}>Total</span>
                  <p className="py-2 text-sm font-semibold text-slate-900">{formatMoney(totals.lines[i].total, form.currency)}</p>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    aria-label="Șterge poziția"
                    disabled={form.items.length === 1}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    onClick={() => set("items", form.items.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={() => set("items", [...form.items, { ...emptyItem }])}
            >
              <Plus className="h-4 w-4" /> Adaugă poziție
            </button>
            <p className="text-sm text-slate-700">
              Total: <b>{formatMoney(totals.total, form.currency)}</b>
              {totals.tax > 0 && <span className="text-slate-500"> (TVA {formatMoney(totals.tax, form.currency)})</span>}
            </p>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.showTotalInWords} onChange={(e) => set("showTotalInWords", e.target.checked)} />
            Afișează „Total (in words)” pe document
          </label>
        </section>

        <section className={card}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className={label}>Status</span>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value as InvoiceStatus)}>
                {INVOICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {INVOICE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className={label}>Suma achitată (gol = integral dacă e „Achitată”)</span>
              <input inputMode="decimal" className={input} value={form.amountPaid} onChange={(e) => set("amountPaid", e.target.value)} />
            </div>
            <div>
              <span className={label}>Data achitării</span>
              <input type="date" className={input} value={form.paidAt} onChange={(e) => set("paidAt", e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <span className={label}>Notițe interne (nu se tipăresc)</span>
              <textarea rows={2} className={input} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
        </section>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-[#6539C0] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Se salvează…" : "Salvează"}
        </button>
      </div>
    </div>
  );
}
