-- Migration 153: Add Ronyx field-ticket OCR columns to aggregate_tickets
-- These are Ronyx-specific fields that the Fast Scan OCR flow captures.
-- Until this migration runs, the OCR route stores them in ocr_json (migration 089).
-- All statements use IF NOT EXISTS and are safe to re-run.

ALTER TABLE public.aggregate_tickets
  -- Ronyx physical ticket fields
  ADD COLUMN IF NOT EXISTS truck_type              text,         -- DUMP TRUCK | TRAILER TRUCK | OTHER
  ADD COLUMN IF NOT EXISTS company_name_of_truck   text,         -- COMPANY NAME OF TRUCK field on physical ticket
  ADD COLUMN IF NOT EXISTS authorized_person       text,         -- AUTHORIZED PERSON who signed the ticket
  ADD COLUMN IF NOT EXISTS signature_present       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_time              text,         -- stored as text: "9:00AM"
  ADD COLUMN IF NOT EXISTS end_time                text,         -- stored as text: "3:00PM"
  ADD COLUMN IF NOT EXISTS total_hours             numeric(6,2),
  ADD COLUMN IF NOT EXISTS copy_color              text,         -- WHITE | YELLOW | PINK (ticket copy color)

  -- OCR quality fields
  ADD COLUMN IF NOT EXISTS ocr_raw_text            text,
  ADD COLUMN IF NOT EXISTS ocr_confidence          numeric(5,2),
  ADD COLUMN IF NOT EXISTS extraction_confidence   numeric(5,2),
  ADD COLUMN IF NOT EXISTS scan_source             text,         -- hp_envy_6552e | ricoh_fi8170 | file_upload | etc.
  ADD COLUMN IF NOT EXISTS document_type           text,         -- ronyx_field_ticket | weight_ticket | delivery_receipt
  ADD COLUMN IF NOT EXISTS scan_batch_id           text,

  -- Reconciliation / workflow
  ADD COLUMN IF NOT EXISTS reconciliation_status   text,         -- pending | matched | exception | voided
  ADD COLUMN IF NOT EXISTS payroll_ready           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_ready           boolean DEFAULT false,

  -- Exception tracking (structured)
  ADD COLUMN IF NOT EXISTS missing_fields          text[],
  ADD COLUMN IF NOT EXISTS exception_flags         text[];

CREATE INDEX IF NOT EXISTS idx_agg_tickets_truck_type    ON public.aggregate_tickets (truck_type);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_scan_source   ON public.aggregate_tickets (scan_source);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_document_type ON public.aggregate_tickets (document_type);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_recon_status  ON public.aggregate_tickets (reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_scan_batch    ON public.aggregate_tickets (scan_batch_id);
