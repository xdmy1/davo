// Acces DB pentru proforme/facturi + garda comună a rutelor /api/admin/invoices.
// Proxy-ul verifică deja sesiunea și permisiunea „invoices"; garda de aici
// repetă verificarea pe server (defense in depth, ca /api/admin/me).

import { NextRequest, NextResponse } from "next/server";
import type { Invoice, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/session";
import { canAccessAPI, normalizeRole } from "@/lib/permissions";
import { bankAccountById } from "@/lib/invoiceBanks";
import {
  dayString,
  invoiceTotals,
  nextInvoiceNumber,
  type InvoiceInput,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoiceType,
} from "@/lib/invoices";

export async function guardInvoices(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const user = await prisma.adminUser.findUnique({
    where: { email: session.email },
    select: { role: true, active: true, permissions: true },
  });
  if (!user?.active) return NextResponse.json({ success: false, error: "Cont dezactivat" }, { status: 401 });
  if (!canAccessAPI(normalizeRole(user.role), req.nextUrl.pathname, user.permissions, req.method)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export const jsonError = (error: string, status = 400) =>
  NextResponse.json({ success: false, error }, { status });

/** Forma trimisă către UI (date ca „YYYY-MM-DD", totaluri calculate). */
export type InvoiceDTO = ReturnType<typeof toInvoiceDTO>;

export function toInvoiceDTO(inv: Invoice & { invoices?: { id: string; number: string }[] }) {
  const items = (inv.items as unknown as InvoiceItem[]) ?? [];
  const totals = invoiceTotals(items, inv.amountPaid, inv.status as InvoiceStatus);
  return {
    id: inv.id,
    type: inv.type as InvoiceType,
    number: inv.number,
    status: inv.status as InvoiceStatus,
    issueDate: dayString(inv.issueDate),
    dueDate: inv.dueDate ? dayString(inv.dueDate) : null,
    poNumber: inv.poNumber,
    currency: inv.currency,
    bank: {
      id: inv.bankAccountId,
      accountName: inv.bankAccountName,
      accountNumber: inv.bankAccountNumber,
      iban: inv.bankIban,
      swift: inv.bankSwift,
      bank: inv.bankName,
    },
    clientName: inv.clientName,
    clientAddress: inv.clientAddress,
    clientCity: inv.clientCity,
    clientCountry: inv.clientCountry,
    clientPostcode: inv.clientPostcode,
    clientVat: inv.clientVat,
    clientEmail: inv.clientEmail,
    items,
    showTotalInWords: inv.showTotalInWords,
    notes: inv.notes,
    amountPaid: inv.amountPaid,
    paidAt: inv.paidAt ? dayString(inv.paidAt) : null,
    sourceProformaId: inv.sourceProformaId,
    convertedTo: inv.invoices?.map((i) => ({ id: i.id, number: i.number })) ?? [],
    totals,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

export async function suggestNumber(type: InvoiceType): Promise<string> {
  const rows = await prisma.invoice.findMany({ select: { type: true, number: true } });
  return nextInvoiceNumber(
    type,
    rows.filter((r) => r.type === type).map((r) => r.number),
    rows.map((r) => r.number),
  );
}

/**
 * Datele de scris în DB. Contul bancar se copiază din config doar când e
 * schimbat (sau la creare) — altfel snapshot-ul vechi rămâne neatins.
 */
export function invoiceWriteData(
  input: InvoiceInput,
  existing?: Pick<Invoice, "bankAccountId">,
): { data: Omit<Prisma.InvoiceUncheckedCreateInput, "id">; error?: undefined } | { error: string } {
  const bankFields =
    existing && existing.bankAccountId === input.bankAccountId
      ? {}
      : (() => {
          const acc = bankAccountById(input.bankAccountId);
          if (!acc) return null;
          return {
            bankAccountName: acc.accountName,
            bankAccountNumber: acc.accountNumber,
            bankIban: acc.iban,
            bankSwift: acc.swift,
            bankName: acc.bank,
          };
        })();
  if (!bankFields) return { error: "Cont bancar necunoscut" };

  return {
    data: {
      type: input.type,
      number: input.number,
      status: input.status,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      poNumber: input.poNumber,
      currency: input.currency,
      bankAccountId: input.bankAccountId,
      ...(bankFields as {
        bankAccountName: string;
        bankAccountNumber: string;
        bankIban: string;
        bankSwift: string;
        bankName: string;
      }),
      clientName: input.clientName,
      clientAddress: input.clientAddress,
      clientCity: input.clientCity,
      clientCountry: input.clientCountry,
      clientPostcode: input.clientPostcode,
      clientVat: input.clientVat,
      clientEmail: input.clientEmail,
      items: input.items as unknown as Prisma.InputJsonValue,
      showTotalInWords: input.showTotalInWords,
      notes: input.notes,
      amountPaid: input.amountPaid,
      paidAt: input.paidAt,
    },
  };
}

export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
