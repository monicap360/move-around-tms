// Invoice data model for accounting module
export type InvoiceStatus = 'pending' | 'paid' | 'overdue';

export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity?: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string;
  paid_at?: string;
  zelle_receipt_url?: string;
  pdf_url?: string;
  line_items: InvoiceLineItem[];
}
