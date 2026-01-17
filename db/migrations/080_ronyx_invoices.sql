-- Migration: Ronyx invoices for billing + AR
CREATE TABLE IF NOT EXISTS public.ronyx_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  invoice_number text NOT NULL,
  customer_name text,
  status text DEFAULT 'open',
  issued_date date,
  due_date date,
  total_amount numeric(12,2) DEFAULT 0,
  ticket_ids uuid[] DEFAULT ARRAY[]::uuid[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_invoices_status
  ON public.ronyx_invoices(status);

CREATE INDEX IF NOT EXISTS idx_ronyx_invoices_customer
  ON public.ronyx_invoices(customer_name);
