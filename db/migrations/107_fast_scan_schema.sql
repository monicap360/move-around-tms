-- Migration 107: Fast Scan schema — add missing columns to user-created tables
--               and create payroll_holds + audit_logs tables that the API needs.
-- All statements use IF NOT EXISTS and are safe to re-run.
-- =============================================================================


-- =============================================================================
-- TABLE 1: fast_scan_uploads
-- User created via Supabase UI (only has id + created_at).
-- API inserts: file_url, file_name, file_type, upload_status, scan_type,
--   detected_*, extracted_text, confidence_score, creates_payroll_item,
--   payroll_action, uploaded_by, related_payroll_item_id, resulting_ticket_id
-- =============================================================================

ALTER TABLE public.fast_scan_uploads
  ADD COLUMN IF NOT EXISTS file_url                 text,
  ADD COLUMN IF NOT EXISTS file_name                text,
  ADD COLUMN IF NOT EXISTS file_type                text        DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS upload_status            text        DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS scan_type                text        DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS detected_job_id          uuid,
  ADD COLUMN IF NOT EXISTS detected_driver_id       uuid,
  ADD COLUMN IF NOT EXISTS detected_vehicle         text,
  ADD COLUMN IF NOT EXISTS detected_amount          numeric(12,2),
  ADD COLUMN IF NOT EXISTS extracted_text           text,
  ADD COLUMN IF NOT EXISTS confidence_score         numeric(5,4) DEFAULT 0.8,
  ADD COLUMN IF NOT EXISTS creates_payroll_item     boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_action           text         DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS uploaded_by              text,
  ADD COLUMN IF NOT EXISTS related_payroll_item_id  uuid,
  ADD COLUMN IF NOT EXISTS resulting_ticket_id      uuid,
  ADD COLUMN IF NOT EXISTS organization_id          uuid         REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at               timestamptz  DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_fsu_status     ON public.fast_scan_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_fsu_scan_type  ON public.fast_scan_uploads(scan_type);
CREATE INDEX IF NOT EXISTS idx_fsu_org        ON public.fast_scan_uploads(organization_id);
CREATE INDEX IF NOT EXISTS idx_fsu_created    ON public.fast_scan_uploads(created_at DESC);


-- =============================================================================
-- TABLE 2: tickets  (user's workflow/action tickets — NOT aggregate_tickets)
-- API inserts: title, description, category, status, priority, source,
--   impact, related_job_id, related_driver_id, related_vehicle_id,
--   fast_scan_id, scan_type, payroll_impact, payroll_status,
--   payroll_hold_reason, estimated_driver_pay, created_by, related_payroll_item_id
-- =============================================================================

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS title                  text,
  ADD COLUMN IF NOT EXISTS description            text,
  ADD COLUMN IF NOT EXISTS category               text,
  ADD COLUMN IF NOT EXISTS status                 text         DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS priority               text         DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source                 text         DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS impact                 text[],
  ADD COLUMN IF NOT EXISTS related_job_id         uuid,
  ADD COLUMN IF NOT EXISTS related_driver_id      uuid,
  ADD COLUMN IF NOT EXISTS related_vehicle_id     text,
  ADD COLUMN IF NOT EXISTS fast_scan_id           uuid         REFERENCES public.fast_scan_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scan_type              text,
  ADD COLUMN IF NOT EXISTS payroll_impact         boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_status         text,
  ADD COLUMN IF NOT EXISTS payroll_hold_reason    text,
  ADD COLUMN IF NOT EXISTS estimated_driver_pay   numeric(12,2),
  ADD COLUMN IF NOT EXISTS created_by             text,
  ADD COLUMN IF NOT EXISTS related_payroll_item_id uuid,
  ADD COLUMN IF NOT EXISTS organization_id        uuid         REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS resolved_at            timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at             timestamptz  DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tickets_status       ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_scan_type    ON public.tickets(scan_type);
CREATE INDEX IF NOT EXISTS idx_tickets_fast_scan_id ON public.tickets(fast_scan_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org          ON public.tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created      ON public.tickets(created_at DESC);


-- =============================================================================
-- TABLE 3: payroll_items
-- API inserts: driver_id, driver_name, related_job_id, job_number,
--   item_type, description, gross_amount, status, hold_reason,
--   source, related_ticket_id, related_scan_id, created_by
-- =============================================================================

ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS driver_id             uuid,
  ADD COLUMN IF NOT EXISTS driver_name           text,
  ADD COLUMN IF NOT EXISTS related_job_id        uuid,
  ADD COLUMN IF NOT EXISTS job_number            text,
  ADD COLUMN IF NOT EXISTS item_type             text         DEFAULT 'adjustment',
  ADD COLUMN IF NOT EXISTS description           text,
  ADD COLUMN IF NOT EXISTS gross_amount          numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount            numeric(12,2),
  ADD COLUMN IF NOT EXISTS status                text         DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS hold_reason           text,
  ADD COLUMN IF NOT EXISTS source                text         DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS related_ticket_id     uuid         REFERENCES public.tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_scan_id       uuid         REFERENCES public.fast_scan_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by            text,
  ADD COLUMN IF NOT EXISTS organization_id       uuid         REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS pay_period_start      date,
  ADD COLUMN IF NOT EXISTS pay_period_end        date,
  ADD COLUMN IF NOT EXISTS approved_by           text,
  ADD COLUMN IF NOT EXISTS approved_at           timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz  DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pi_driver_id   ON public.payroll_items(driver_id);
CREATE INDEX IF NOT EXISTS idx_pi_status      ON public.payroll_items(status);
CREATE INDEX IF NOT EXISTS idx_pi_org         ON public.payroll_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_pi_ticket      ON public.payroll_items(related_ticket_id);


-- =============================================================================
-- TABLE 4: payroll_holds  (new — referenced in fast-scan API, didn't exist)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payroll_holds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id  uuid NOT NULL REFERENCES public.payroll_items(id) ON DELETE CASCADE,
  hold_reason      text,
  hold_type        text,
  held_by          text,
  released_by      text,
  released_at      timestamptz,
  release_notes    text,
  organization_id  uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_item_id ON public.payroll_holds(payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_ph_org     ON public.payroll_holds(organization_id);

ALTER TABLE public.payroll_holds ENABLE ROW LEVEL SECURITY;

-- Org-scoped access (same pattern as migration 106)
DROP POLICY IF EXISTS "ph_select" ON public.payroll_holds;
DROP POLICY IF EXISTS "ph_insert" ON public.payroll_holds;
DROP POLICY IF EXISTS "ph_update" ON public.payroll_holds;
DROP POLICY IF EXISTS "ph_delete" ON public.payroll_holds;

CREATE POLICY "ph_select" ON public.payroll_holds
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "ph_insert" ON public.payroll_holds
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "ph_update" ON public.payroll_holds
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "ph_delete" ON public.payroll_holds
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- =============================================================================
-- TABLE 5: audit_logs  (new — referenced in fast-scan API, didn't exist)
-- Stores general action audit trail across all tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    text NOT NULL,
  record_id     uuid,
  action        text NOT NULL,
  old_values    jsonb,
  new_values    jsonb,
  performed_by  text,
  performed_at  timestamptz DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  metadata      jsonb
);

CREATE INDEX IF NOT EXISTS idx_al_table_record  ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_al_performed_at  ON public.audit_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_action        ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_org           ON public.audit_logs(organization_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read: managers can see their org's audit trail
DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
CREATE POLICY "al_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

-- Insert: any authenticated user can write audit entries for their org
DROP POLICY IF EXISTS "al_insert" ON public.audit_logs;
CREATE POLICY "al_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

-- No UPDATE or DELETE on audit records — they are immutable
