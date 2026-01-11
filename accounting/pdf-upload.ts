// Generate and upload PDF invoice to Supabase Storage
import { generateInvoicePDF } from "./pdf";
import { supabase } from "./supabase";
import { updateInvoice } from "./supabase";
import { Invoice } from "./invoice.types";

export async function generateAndUploadInvoicePDF(invoice: Invoice) {
  // 1. Generate PDF
  const pdfBytes = await generateInvoicePDF(invoice);
  const file = new File([pdfBytes], `invoice-${invoice.id}.pdf`, {
    type: "application/pdf",
  });
  // 2. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("invoices")
    .upload(`invoices/${invoice.user_id}/${file.name}`, file, { upsert: true });
  if (error) throw error;
  // 3. Get public URL
  const { publicURL } = supabase.storage
    .from("invoices")
    .getPublicUrl(data.path);
  // 4. Update invoice record
  await updateInvoice(invoice.id, { pdf_url: publicURL });
  return publicURL;
}
