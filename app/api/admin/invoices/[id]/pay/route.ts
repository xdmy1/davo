import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDay, todayChisinau } from "@/lib/invoices";
import { guardInvoices, jsonError, toInvoiceDTO } from "@/lib/invoiceStore";

export const dynamic = "force-dynamic";

// „Marchează achitat": integral, cu data de azi. Plățile parțiale se pun din
// formularul de editare (suma achitată + data).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    const exists = await prisma.invoice.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return jsonError("Documentul nu există", 404);
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "paid", amountPaid: null, paidAt: parseDay(todayChisinau()) },
    });
    return NextResponse.json({ success: true, invoice: toInvoiceDTO(updated) });
  } catch (error) {
    console.error("admin/invoices pay", error);
    return jsonError("Nu am putut marca achitat", 500);
  }
}
