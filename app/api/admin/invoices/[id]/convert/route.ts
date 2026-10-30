import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDay, todayChisinau } from "@/lib/invoices";
import { guardInvoices, isUniqueViolation, jsonError, suggestNumber, toInvoiceDTO } from "@/lib/invoiceStore";

export const dynamic = "force-dynamic";

// Proformă → factură: același client, aceleași poziții și același cont,
// următorul număr din seria facturilor, data de azi, ciornă. Legătura rămâne
// în `sourceProformaId`.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    const p = await prisma.invoice.findUnique({ where: { id } });
    if (!p) return jsonError("Documentul nu există", 404);
    if (p.type !== "proforma") return jsonError("Doar o proformă se poate converti");

    // Două conversii simultane pot primi același număr: a doua reîncearcă.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const created = await prisma.invoice.create({
          data: {
            type: "invoice",
            number: await suggestNumber("invoice"),
            status: "draft",
            issueDate: parseDay(todayChisinau())!,
            dueDate: null,
            poNumber: p.poNumber,
            currency: p.currency,
            bankAccountId: p.bankAccountId,
            bankAccountName: p.bankAccountName,
            bankAccountNumber: p.bankAccountNumber,
            bankIban: p.bankIban,
            bankSwift: p.bankSwift,
            bankName: p.bankName,
            clientName: p.clientName,
            clientAddress: p.clientAddress,
            clientCity: p.clientCity,
            clientCountry: p.clientCountry,
            clientPostcode: p.clientPostcode,
            clientVat: p.clientVat,
            clientEmail: p.clientEmail,
            items: p.items ?? [],
            showTotalInWords: true,
            sourceProformaId: p.id,
          },
        });
        return NextResponse.json({ success: true, invoice: toInvoiceDTO(created) });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
    return jsonError("Nu am găsit un număr liber, reîncearcă", 409);
  } catch (error) {
    console.error("admin/invoices convert", error);
    return jsonError("Nu am putut crea factura", 500);
  }
}
