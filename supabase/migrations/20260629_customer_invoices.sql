CREATE TABLE IF NOT EXISTS customer_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  invoice_number text,
  customer_name text,
  customer_id uuid,
  job text,
  invoice_date date DEFAULT now(),
  due_date date,
  original_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  status text DEFAULT 'open',
  dispute_status text,
  credit_hold boolean DEFAULT false,
  ticket_numbers jsonb,
  ticket_count int DEFAULT 0,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  amount numeric DEFAULT 0,
  paid_at date DEFAULT now(),
  method text,
  reference text,
  recorded_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_org ON customer_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_inv ON invoice_payments(invoice_id);
