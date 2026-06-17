-- Migration 151: Add dump-truck-specific fields to aggregate_tickets
-- These are sent by the Fast Scan form but had no column to land in.
-- All statements use IF NOT EXISTS and are safe to re-run.

ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS vendor_name       text,          -- quarry / supplier (e.g. Martin Marietta)
  ADD COLUMN IF NOT EXISTS pit_location_name text,          -- pit / quarry address
  ADD COLUMN IF NOT EXISTS po_number         text,          -- purchase order number
  ADD COLUMN IF NOT EXISTS scan_type         text,          -- 'weight_ticket' | 'delivery_receipt' | etc.
  ADD COLUMN IF NOT EXISTS total_amount      numeric(12,2); -- total invoice/pay amount

CREATE INDEX IF NOT EXISTS idx_agg_tickets_vendor_name ON public.aggregate_tickets (vendor_name);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_po_number   ON public.aggregate_tickets (po_number);
