import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseInvoiceInput } from "@/lib/invoices";
import { guardInvoices, invoiceWriteData, isUniqueViolation, jsonError, toInvoiceDTO } from "@/lib/invoiceStore";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: { invoices: { select: { id: true, number: true } } },
  });
  if (!inv) return jsonError("Documentul nu există", 404);
  return NextResponse.json({ success: true, invoice: toInvoiceDTO(inv) });
}

// Editare permisă și pe documente emise/achitate (corectură de greșeli);
// `updatedAt` păstrează momentul ultimei modificări.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    const existing = await prisma.invoice.findUnique({ where: { id }, select: { bankAccountId: true } });
    if (!existing) return jsonError("Documentul nu există", 404);
    const parsed = parseInvoiceInput(await req.json().catch(() => null));
    if (!parsed.ok) return jsonError(parsed.error);
    const write = invoiceWriteData(parsed.data, existing);
    if (write.error !== undefined) return jsonError(write.error);
    const updated = await prisma.invoice.update({ where: { id }, data: write.data });
    return NextResponse.json({ success: true, invoice: toInvoiceDTO(updated) });
  } catch (error) {
    if (isUniqueViolation(error)) return jsonError("Numărul există deja", 409);
    console.error("admin/invoices PUT", error);
    return jsonError("Nu am putut salva documentul", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = await guardInvoices(req);
  if (denied) return denied;
  const { id } = await params;
  try {
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin/invoices DELETE", error);
    return jsonError("Nu am putut șterge documentul", 500);
  }
}
