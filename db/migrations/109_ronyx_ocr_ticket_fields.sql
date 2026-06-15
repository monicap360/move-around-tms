-- Migration 109: Ronyx Field Ticket OCR columns
-- Adds fields required for ScanSnap / camera OCR of Ronyx dump truck field tickets

ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS scan_source             text,
  ADD COLUMN IF NOT EXISTS document_type           text,
  ADD COLUMN IF NOT EXISTS reconciliation_status   text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payroll_hold            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_hold            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_ready           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_ready           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS truck_type              text,
  ADD COLUMN IF NOT EXISTS company_name_of_truck   text,
  ADD COLUMN IF NOT EXISTS authorized_person       text,
  ADD COLUMN IF NOT EXISTS signature_present       boolean,
  ADD COLUMN IF NOT EXISTS start_time              text,
  ADD COLUMN IF NOT EXISTS end_time                text,
  ADD COLUMN IF NOT EXISTS total_hours             numeric(8,2),
  ADD COLUMN IF NOT EXISTS copy_color              text,
  ADD COLUMN IF NOT EXISTS extraction_confidence   numeric(5,2),
  ADD COLUMN IF NOT EXISTS missing_fields          text[],
  ADD COLUMN IF NOT EXISTS exception_flags         text[];

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_agg_tickets_document_type          ON public.aggregate_tickets(document_type);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_reconciliation_status  ON public.aggregate_tickets(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_payroll_hold           ON public.aggregate_tickets(payroll_hold) WHERE payroll_hold = true;
CREATE INDEX IF NOT EXISTS idx_agg_tickets_billing_hold           ON public.aggregate_tickets(billing_hold)  WHERE billing_hold  = true;
CREATE INDEX IF NOT EXISTS idx_agg_tickets_scan_source            ON public.aggregate_tickets(scan_source);
