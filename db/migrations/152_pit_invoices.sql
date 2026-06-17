-- Migration 152: Pit / vendor invoice uploads
-- Stores incoming invoices from quarry vendors (Martin Marietta, etc.)
-- These are reconciled against aggregate_tickets to find mismatches.

CREATE TABLE IF NOT EXISTS public.pit_invoices (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name             text,
  invoice_number          text,
  invoice_date            date,
  pit_location_name       text,
  file_url                text,
  file_name               text,
  material                text,
  total_amount            numeric(12,2),
  total_tons              numeric(12,2),
  unit_price              numeric(12,4),
  fuel_surcharge          numeric(12,2),
  status                  text        NOT NULL DEFAULT 'uploaded',
  extracted_ticket_numbers text[]     DEFAULT ARRAY[]::text[],
  matched_ticket_ids      uuid[]      DEFAULT ARRAY[]::uuid[],
  unmatched_count         int         DEFAULT 0,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pit_invoices_vendor   ON public.pit_invoices (vendor_name);
CREATE INDEX IF NOT EXISTS idx_pit_invoices_status   ON public.pit_invoices (status);
CREATE INDEX IF NOT EXISTS idx_pit_invoices_date     ON public.pit_invoices (invoice_date);
