// Automated invoice generation on Zelle payment approval
import { createInvoice, markInvoicePaid } from './invoice.logic';
import { insertInvoice, updateInvoice } from './supabase';
import { InvoiceLineItem } from './invoice.types';
import { generateAndUploadInvoicePDF } from './pdf-upload';

// Call this when a Zelle payment is approved by admin
export async function handleZellePaymentApproved(payment: {
  id: string;
  user_id: string;
  file_url: string;
  amount: number;
  description: string;
  created_at: string;
}) {
  // 1. Create invoice for this payment
  const invoice = createInvoice({
    user_id: payment.user_id,
    amount: payment.amount,
    description: payment.description || 'Subscription Payment',
    due_at: payment.created_at,
    line_items: [
      { description: payment.description || 'Subscription', amount: payment.amount }
    ],
    zelle_receipt_url: payment.file_url,
  });
  // 2. Mark as paid immediately (since Zelle is confirmed)
  const paidInvoice = markInvoicePaid(invoice, payment.created_at);
  // 3. Insert into invoices table
  await insertInvoice(paidInvoice);
  // Generate and upload PDF, then update invoice
  await generateAndUploadInvoicePDF(paidInvoice);
}

// Optionally, call this from admin approval logic in admin-zelle.tsx
