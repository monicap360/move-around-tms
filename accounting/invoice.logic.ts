// Core logic for invoice creation, status updates, and linking to Zelle payments
import { Invoice, InvoiceLineItem, InvoiceStatus } from "./invoice.types";
import { v4 as uuidv4 } from "uuid";

// Create a new invoice
export function createInvoice(params: {
  user_id: string;
  amount: number;
  currency?: string;
  description: string;
  due_at: string;
  line_items: InvoiceLineItem[];
  zelle_receipt_url?: string;
}): Invoice {
  return {
    id: uuidv4(),
    user_id: params.user_id,
    amount: params.amount,
    currency: params.currency || "USD",
    description: params.description,
    status: "pending",
    issued_at: new Date().toISOString(),
    due_at: params.due_at,
    line_items: params.line_items,
    zelle_receipt_url: params.zelle_receipt_url,
  };
}

// Mark invoice as paid
export function markInvoicePaid(invoice: Invoice, paid_at?: string): Invoice {
  return {
    ...invoice,
    status: "paid",
    paid_at: paid_at || new Date().toISOString(),
  };
}

// Mark invoice as overdue
export function markInvoiceOverdue(invoice: Invoice): Invoice {
  return {
    ...invoice,
    status: "overdue",
  };
}
