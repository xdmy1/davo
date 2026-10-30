"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileOutput, Pencil, Printer } from "lucide-react";

const btn =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50";

export default function InvoiceToolbar({
  id,
  type,
  status,
  fileName,
  convertedTo,
}: {
  id: string;
  type: "proforma" | "invoice";
  status: string;
  fileName: string;
  convertedTo: { id: string; number: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Titlul paginii (= numele propus de „Save as PDF") vine din generateMetadata.
  // Din listă („Descarcă PDF"): deschide direct dialogul de print, după font.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      document.fonts.ready.then(() => window.print());
    }
  }, []);

  async function post(path: string): Promise<{ id: string } | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}/${path}`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Eroare");
      return data.invoice;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/facturi" className={btn}>
          <ArrowLeft className="h-4 w-4" /> Facturi
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-[#6539C0] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          onClick={() => {
            document.title = fileName;
            window.print();
          }}
        >
          <Printer className="h-4 w-4" /> Descarcă PDF / Printează
        </button>
        <Link href={`/admin/facturi/${id}/edit`} className={btn}>
          <Pencil className="h-4 w-4" /> Editează
        </Link>
        {status !== "paid" && status !== "cancelled" && (
          <button
            className={btn}
            disabled={busy}
            onClick={async () => {
              if (await post("pay")) router.refresh();
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Marchează achitat
          </button>
        )}
        {type === "proforma" && (
          <button
            className={btn}
            disabled={busy}
            onClick={async () => {
              if (convertedTo.length && !confirm(`Există deja factura ${convertedTo.map((c) => c.number).join(", ")}. Creezi încă una?`)) return;
              const inv = await post("convert");
              if (inv) router.push(`/admin/facturi/${inv.id}/edit`);
            }}
          >
            <FileOutput className="h-4 w-4" /> Convertește în factură
          </button>
        )}
        {convertedTo.map((c) => (
          <Link key={c.id} href={`/admin/facturi/${c.id}`} className="text-sm font-semibold text-[#6539C0] underline">
            Factura {c.number}
          </Link>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">
        La „Salvează ca PDF”, alege mărimea A4 și margini „Implicite”/„Niciuna”; bifează „Grafică de fundal” dacă culorile lipsesc.
      </p>
    </div>
  );
}
