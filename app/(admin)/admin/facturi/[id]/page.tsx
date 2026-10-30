import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toInvoiceDTO } from "@/lib/invoiceStore";
import { invoiceFileName } from "@/lib/invoices";
import InvoiceDocument from "@/components/admin/invoices/InvoiceDocument";
import InvoiceToolbar from "@/components/admin/invoices/InvoiceToolbar";

export const dynamic = "force-dynamic";

// Titlul paginii = numele propus de „Save as PDF" (stilul Refrens).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = await prisma.invoice.findUnique({ where: { id }, select: { type: true, number: true, clientName: true } });
  return row ? { title: { absolute: invoiceFileName(row.type, row.number, row.clientName) } } : {};
}

// Accesul e gardat de proxy (secțiunea „invoices").
export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.invoice.findUnique({
    where: { id },
    include: { invoices: { select: { id: true, number: true } } },
  });
  if (!row) notFound();
  const invoice = toInvoiceDTO(row);

  return (
    <div>
      <InvoiceToolbar
        id={invoice.id}
        type={invoice.type}
        status={invoice.status}
        fileName={invoiceFileName(invoice.type, invoice.number, invoice.clientName)}
        convertedTo={invoice.convertedTo}
      />
      <div className="overflow-x-auto print:overflow-visible">
        <div className="w-fit shadow-lg print:shadow-none mx-auto">
          <InvoiceDocument invoice={invoice} />
        </div>
      </div>
    </div>
  );
}
