-- Migration 108: Excel staging tables for excel-reconcile-ingest edge function
-- Creates ticket_excel_uploads and ticket_excel_rows used by the edge function
-- to store parsed Excel rows before reconciliation runs.
-- =============================================================================

-- ── ticket_excel_uploads ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_excel_uploads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  upload_type      text        NOT NULL DEFAULT 'vendor_excel',
  file_name        text,
  file_path        text,
  parse_status     text        NOT NULL DEFAULT 'pending',
  row_count        integer     DEFAULT 0,
  reconcile_run_id uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teu_org        ON public.ticket_excel_uploads(organization_id);
CREATE INDEX IF NOT EXISTS idx_teu_status     ON public.ticket_excel_uploads(parse_status);
CREATE INDEX IF NOT EXISTS idx_teu_created    ON public.ticket_excel_uploads(created_at DESC);

ALTER TABLE public.ticket_excel_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teu_select" ON public.ticket_excel_uploads;
DROP POLICY IF EXISTS "teu_insert" ON public.ticket_excel_uploads;
DROP POLICY IF EXISTS "teu_update" ON public.ticket_excel_uploads;

CREATE POLICY "teu_select" ON public.ticket_excel_uploads
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "teu_insert" ON public.ticket_excel_uploads
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "teu_update" ON public.ticket_excel_uploads
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ── ticket_excel_rows ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_excel_rows (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  upload_id         uuid        NOT NULL REFERENCES public.ticket_excel_uploads(id) ON DELETE CASCADE,
  row_number        integer,
  ticket_number     text,
  ticket_date       date,
  truck_number      text,
  driver_name       text,
  customer_name     text,
  project_name      text,
  po_number         text,
  pit_location_name text,
  material_name     text,
  tons              numeric(12,3),
  rate              numeric(12,4),
  amount            numeric(12,2),
  invoice_number    text,
  match_status      text        DEFAULT 'unmatched',
  mismatch_codes    text[]      DEFAULT '{}',
  matched_ticket_id uuid        REFERENCES public.aggregate_tickets(id) ON DELETE SET NULL,
  raw_row           jsonb       DEFAULT '{}',
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ter_upload    ON public.ticket_excel_rows(upload_id);
CREATE INDEX IF NOT EXISTS idx_ter_org       ON public.ticket_excel_rows(organization_id);
CREATE INDEX IF NOT EXISTS idx_ter_ticket    ON public.ticket_excel_rows(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ter_status    ON public.ticket_excel_rows(match_status);
CREATE INDEX IF NOT EXISTS idx_ter_created   ON public.ticket_excel_rows(created_at DESC);

ALTER TABLE public.ticket_excel_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ter_select" ON public.ticket_excel_rows;
DROP POLICY IF EXISTS "ter_insert" ON public.ticket_excel_rows;
DROP POLICY IF EXISTS "ter_update" ON public.ticket_excel_rows;

CREATE POLICY "ter_select" ON public.ticket_excel_rows
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "ter_insert" ON public.ticket_excel_rows
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "ter_update" ON public.ticket_excel_rows
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());
