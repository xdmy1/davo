import InvoiceForm from "@/components/admin/invoices/InvoiceForm";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <InvoiceForm initialType={type === "proforma" ? "proforma" : "invoice"} />;
}
