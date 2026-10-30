import InvoiceForm from "@/components/admin/invoices/InvoiceForm";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceForm id={id} />;
}
