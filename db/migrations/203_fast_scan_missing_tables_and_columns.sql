-- ============================================================
-- MIGRATION 203
-- Fast Scan — missing tables and columns
--
-- Migration 107 added columns via ALTER TABLE on fast_scan_uploads,
-- tickets, and payroll_items. Those tables either didn't exist yet
-- (causing the ALTERs to fail) or were later recreated by migration
-- 185 with a different schema. This migration ensures all three
-- tables exist with the full column set the API expects.
--
-- All statements are idempotent (CREATE TABLE IF NOT EXISTS +
-- ADD COLUMN IF NOT EXISTS). Safe to re-run.
-- ============================================================


-- ============================================================
-- 1. tickets  (workflow/action tickets — NOT aggregate_tickets)
--    The API in fast-scan/route.ts inserts into this table.
--    It is conceptually distinct from aggregate_tickets (dump-
--    truck scan tickets). Think of it as internal task tickets.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  title                  text,
  description            text,
  category               text,
  status                 text        NOT NULL DEFAULT 'new',
  priority               text        NOT NULL DEFAULT 'medium',
  source                 text        NOT NULL DEFAULT 'manual',
  impact                 text[],
  related_job_id         uuid,
  related_driver_id      uuid,
  related_vehicle_id     text,
  fast_scan_id           uuid,
  scan_type              text,
  payroll_impact         boolean     NOT NULL DEFAULT false,
  payroll_status         text,
  payroll_hold_reason    text,
  estimated_driver_pay   numeric(12,2),
  related_payroll_item_id uuid,
  created_by             text,
  resolved_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Add any columns that may be missing if the table already existed
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS organization_id         uuid         REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title                   text,
  ADD COLUMN IF NOT EXISTS description             text,
  ADD COLUMN IF NOT EXISTS category                text,
  ADD COLUMN IF NOT EXISTS status                  text         DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS priority                text         DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source                  text         DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS impact                  text[],
  ADD COLUMN IF NOT EXISTS related_job_id          uuid,
  ADD COLUMN IF NOT EXISTS related_driver_id       uuid,
  ADD COLUMN IF NOT EXISTS related_vehicle_id      text,
  ADD COLUMN IF NOT EXISTS fast_scan_id            uuid,
  ADD COLUMN IF NOT EXISTS scan_type               text,
  ADD COLUMN IF NOT EXISTS payroll_impact          boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_status          text,
  ADD COLUMN IF NOT EXISTS payroll_hold_reason     text,
  ADD COLUMN IF NOT EXISTS estimated_driver_pay    numeric(12,2),
  ADD COLUMN IF NOT EXISTS related_payroll_item_id uuid,
  ADD COLUMN IF NOT EXISTS created_by              text,
  ADD COLUMN IF NOT EXISTS resolved_at             timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at              timestamptz  DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tickets_status        ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_scan_type     ON public.tickets(scan_type);
CREATE INDEX IF NOT EXISTS idx_tickets_fast_scan_id  ON public.tickets(fast_scan_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org           ON public.tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created       ON public.tickets(created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;

CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org() OR organization_id IS NULL);

CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org() OR organization_id IS NULL)
  WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ============================================================
-- 2. payroll_items  (fast-scan-linked payroll entries)
--    Referenced by payroll_holds FK and by fast-scan/route.ts.
--    Distinct from ronyx_payroll_items (payroll run line items).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payroll_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id           uuid,
  driver_name         text,
  related_job_id      uuid,
  job_number          text,
  item_type           text        NOT NULL DEFAULT 'adjustment',
  description         text,
  gross_amount        numeric(12,2) NOT NULL DEFAULT 0,
  net_amount          numeric(12,2),
  status              text        NOT NULL DEFAULT 'pending',
  hold_reason         text,
  source              text        NOT NULL DEFAULT 'manual',
  related_ticket_id   uuid        REFERENCES public.tickets(id) ON DELETE SET NULL,
  related_scan_id     uuid        REFERENCES public.fast_scan_uploads(id) ON DELETE SET NULL,
  created_by          text,
  pay_period_start    date,
  pay_period_end      date,
  approved_by         text,
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Add any columns that may be missing if the table already existed
ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS organization_id     uuid         REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS driver_id           uuid,
  ADD COLUMN IF NOT EXISTS driver_name         text,
  ADD COLUMN IF NOT EXISTS related_job_id      uuid,
  ADD COLUMN IF NOT EXISTS job_number          text,
  ADD COLUMN IF NOT EXISTS item_type           text         DEFAULT 'adjustment',
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS gross_amount        numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount          numeric(12,2),
  ADD COLUMN IF NOT EXISTS status              text         DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS hold_reason         text,
  ADD COLUMN IF NOT EXISTS source              text         DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS related_ticket_id   uuid,
  ADD COLUMN IF NOT EXISTS related_scan_id     uuid,
  ADD COLUMN IF NOT EXISTS created_by          text,
  ADD COLUMN IF NOT EXISTS pay_period_start    date,
  ADD COLUMN IF NOT EXISTS pay_period_end      date,
  ADD COLUMN IF NOT EXISTS approved_by         text,
  ADD COLUMN IF NOT EXISTS approved_at         timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz  DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pi_driver_id   ON public.payroll_items(driver_id);
CREATE INDEX IF NOT EXISTS idx_pi_status      ON public.payroll_items(status);
CREATE INDEX IF NOT EXISTS idx_pi_org         ON public.payroll_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_pi_ticket      ON public.payroll_items(related_ticket_id);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pi_select" ON public.payroll_items;
DROP POLICY IF EXISTS "pi_insert" ON public.payroll_items;
DROP POLICY IF EXISTS "pi_update" ON public.payroll_items;

CREATE POLICY "pi_select" ON public.payroll_items
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org() OR organization_id IS NULL);

CREATE POLICY "pi_insert" ON public.payroll_items
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);

CREATE POLICY "pi_update" ON public.payroll_items
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org() OR organization_id IS NULL)
  WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ============================================================
-- 3. fast_scan_uploads — add columns migration 107 tried to add
--    Migration 185 created the table with a different schema.
--    These ADD COLUMN IF NOT EXISTS statements are safe to run
--    against either the 107 schema or the 185 schema.
-- ============================================================

ALTER TABLE public.fast_scan_uploads
  ADD COLUMN IF NOT EXISTS file_url                 text,
  ADD COLUMN IF NOT EXISTS file_type                text         DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS scan_type                text         DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS detected_job_id          uuid,
  ADD COLUMN IF NOT EXISTS detected_driver_id       uuid,
  ADD COLUMN IF NOT EXISTS detected_vehicle         text,
  ADD COLUMN IF NOT EXISTS detected_amount          numeric(12,2),
  ADD COLUMN IF NOT EXISTS extracted_text           text,
  ADD COLUMN IF NOT EXISTS confidence_score         numeric(5,4)  DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS creates_payroll_item     boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_action           text          DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS uploaded_by              text,
  ADD COLUMN IF NOT EXISTS related_payroll_item_id  uuid          REFERENCES public.payroll_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resulting_ticket_id      uuid          REFERENCES public.tickets(id) ON DELETE SET NULL;

-- Add the fast_scan_id FK on tickets now that fast_scan_uploads exists
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS fast_scan_id uuid REFERENCES public.fast_scan_uploads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fsu_status     ON public.fast_scan_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_fsu_scan_type  ON public.fast_scan_uploads(scan_type);
CREATE INDEX IF NOT EXISTS idx_fsu_created    ON public.fast_scan_uploads(created_at DESC);


-- ============================================================
-- 4. fast_scan_audit_events — allow event types used by the API
--    that weren't in the original constraint list
-- ============================================================

ALTER TABLE public.fast_scan_audit_events
  DROP CONSTRAINT IF EXISTS fast_scan_audit_events_type_check;

ALTER TABLE public.fast_scan_audit_events
  ADD CONSTRAINT fast_scan_audit_events_type_check CHECK (
    event_type IN (
      'uploaded',
      'ocr_started',
      'ocr_completed',
      'ocr_failed',
      'field_corrected',
      'matched',
      'mismatch_found',
      'review_requested',
      'approved',
      'rejected',
      'payroll_hold_created',
      'payroll_hold_released',
      'sent_to_payroll',
      'sent_to_billing',
      'invoice_matched',
      'excel_reconciled',
      'note_added',
      'linked',
      'email_queued',
      'email_sent',
      'processing',
      'reviewed'
    )
  );


-- ============================================================
-- 5. Validate
-- ============================================================

SELECT
  table_name,
  'exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tickets', 'payroll_items', 'fast_scan_uploads', 'fast_scan_audit_events')
ORDER BY table_name;
