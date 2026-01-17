-- Migration: Ronyx invoice accounting + AR fields
ALTER TABLE public.ronyx_invoices
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_date date,
  ADD COLUMN IF NOT EXISTS accounting_status text DEFAULT 'not_exported',
  ADD COLUMN IF NOT EXISTS accounting_exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS accounting_reference text;

CREATE INDEX IF NOT EXISTS idx_ronyx_invoices_payment_status
  ON public.ronyx_invoices(payment_status);

CREATE INDEX IF NOT EXISTS idx_ronyx_invoices_accounting_status
  ON public.ronyx_invoices(accounting_status);
