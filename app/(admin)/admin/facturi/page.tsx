"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Badge from "@/components/admin/Badge";
import EmptyState from "@/components/admin/EmptyState";
import {
  INVOICE_STATUS_LABEL,
  INVOICE_TYPE_LABEL,
  formatInvoiceDate,
  formatMoney,
  type InvoiceStatus,
} from "@/lib/invoices";
import type { InvoiceDTO } from "@/lib/invoiceStore";

const STATUS_BADGE: Record<InvoiceStatus, "slate" | "blue" | "green" | "red"> = {
  draft: "slate",
  issued: "blue",
  paid: "green",
  cancelled: "red",
};

const iconBtn = "rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900";

export default function FacturiPage() {
  const [type, setType] = useState("");
  const [rows, setRows] = useState<InvoiceDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/invoices${type ? `?type=${type}` : ""}`).then((x) => x.json());
      if (!r.success) throw new Error(r.error);
      setRows(r.invoices);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare");
    }
  }, [type]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- încărcare inițială/la schimbarea filtrului
    load();
  }, [load]);

  async function action(id: string, method: "POST" | "DELETE", path = "") {
    const r = await fetch(`/api/admin/invoices/${id}${path}`, { method }).then((x) => x.json());
    if (!r.success) alert(r.error || "Eroare");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Facturi"
        subtitle="Proforme și facturi DAVO GROUP S.R.L."
        actions={
          <>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toate tipurile</option>
              <option value="proforma">Proforme</option>
              <option value="invoice">Facturi</option>
            </select>
            <Link
              href="/admin/facturi/nou?type=proforma"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <Plus className="h-4 w-4" /> Proformă
            </Link>
            <Link
              href="/admin/facturi/nou?type=invoice"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6539C0] px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Factură
            </Link>
          </>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {rows === null ? (
        <p className="text-sm text-slate-500">Se încarcă…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Niciun document" description="Creează prima proformă sau factură." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tip</th>
                <th className="px-4 py-3">Număr</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Badge variant={r.type === "invoice" ? "purple" : "slate"}>{INVOICE_TYPE_LABEL[r.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/admin/facturi/${r.id}`} className="hover:underline">
                      {r.number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatInvoiceDate(r.issueDate)}</td>
                  <td className="px-4 py-3">{r.clientName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    {formatMoney(r.totals.total, r.currency)}
                    {r.totals.paid > 0 && r.totals.balance > 0 && (
                      <div className="text-xs font-normal text-amber-700">rest {formatMoney(r.totals.balance, r.currency)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[r.status]}>{INVOICE_STATUS_LABEL[r.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/admin/facturi/${r.id}`} className={iconBtn} title="Deschide">
                      <Eye className="inline h-4 w-4" />
                    </Link>
                    <Link href={`/admin/facturi/${r.id}/edit`} className={iconBtn} title="Editează">
                      <Pencil className="inline h-4 w-4" />
                    </Link>
                    <Link href={`/admin/facturi/${r.id}?print=1`} className={iconBtn} title="Descarcă PDF">
                      <Printer className="inline h-4 w-4" />
                    </Link>
                    {r.status !== "paid" && r.status !== "cancelled" && (
                      <button className={iconBtn} title="Marchează achitat" onClick={() => action(r.id, "POST", "/pay")}>
                        <CheckCircle2 className="inline h-4 w-4" />
                      </button>
                    )}
                    <button
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Șterge"
                      onClick={() => {
                        if (confirm(`Ștergi ${INVOICE_TYPE_LABEL[r.type].toLowerCase()} ${r.number}? Nu se poate anula.`)) {
                          action(r.id, "DELETE");
                        }
                      }}
                    >
                      <Trash2 className="inline h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
