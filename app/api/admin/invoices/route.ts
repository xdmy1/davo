import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INVOICE_TYPES, parseInvoiceInput, type InvoiceType } from "@/lib/invoices";
import {
  guardInvoices,
  invoiceWriteData,
  isUniqueViolation,
  jsonError,
  suggestNumber,
  toInvoiceDTO,
} from "@/lib/invoiceStore";

export const dynamic = "force-dynamic";

// Lista + numerele propuse pentru ambele serii.
export async function GET(req: NextRequest) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  try {
    const type = req.nextUrl.searchParams.get("type");
    // `?only=next`: formularul nou are nevoie doar de numerele propuse.
    const onlyNext = req.nextUrl.searchParams.get("only") === "next";
    const rows = onlyNext ? [] : await prisma.invoice.findMany({
      where: INVOICE_TYPES.includes(type as InvoiceType) ? { type: type as InvoiceType } : {},
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      include: { invoices: { select: { id: true, number: true } } },
    });
    const [proforma, invoice] = await Promise.all([suggestNumber("proforma"), suggestNumber("invoice")]);
    return NextResponse.json({
      success: true,
      invoices: rows.map(toInvoiceDTO),
      nextNumbers: { proforma, invoice },
    });
  } catch (error) {
    console.error("admin/invoices GET", error);
    return jsonError("Nu am putut încărca facturile", 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  try {
    const parsed = parseInvoiceInput(await req.json().catch(() => null));
    if (!parsed.ok) return jsonError(parsed.error);
    const write = invoiceWriteData(parsed.data);
    if (write.error !== undefined) return jsonError(write.error);
    const created = await prisma.invoice.create({ data: write.data });
    return NextResponse.json({ success: true, invoice: toInvoiceDTO(created) });
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError("Numărul există deja", 409);
    console.error("admin/invoices POST", error);
    return jsonError("Nu am putut salva documentul", 500);
  }
}
