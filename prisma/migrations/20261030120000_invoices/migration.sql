-- Proforme și facturi (admin → Facturi). 100% aditiv: două enum-uri și un tabel nou.
-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('proforma', 'invoice');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "issueDate" DATE NOT NULL,
    "dueDate" DATE,
    "poNumber" TEXT,
    "currency" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "bankIban" TEXT NOT NULL,
    "bankSwift" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL DEFAULT '',
    "clientCity" TEXT,
    "clientCountry" TEXT,
    "clientPostcode" TEXT,
    "clientVat" TEXT,
    "clientEmail" TEXT,
    "items" JSONB NOT NULL,
    "showTotalInWords" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "amountPaid" DOUBLE PRECISION,
    "paidAt" DATE,
    "sourceProformaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_type_issueDate_idx" ON "Invoice"("type", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_sourceProformaId_idx" ON "Invoice"("sourceProformaId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_sourceProformaId_fkey" FOREIGN KEY ("sourceProformaId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

