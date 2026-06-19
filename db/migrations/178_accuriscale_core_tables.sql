-- ============================================================
-- Migration 178: AccuriScale Intelligence™ — Core Tables
--
-- Creates the load/ticket/match/exception foundation for
-- pit-to-pay reconciliation.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================


-- ─── 1. accuriscale_loads ────────────────────────────────────────────────────
-- One row per haul/dispatch load.

CREATE TABLE IF NOT EXISTS public.accuriscale_loads (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispatch_job_id       uuid,
  customer_id           uuid,
  project_id            uuid,
  driver_id             uuid,
  truck_id              uuid,
  owner_operator_id     uuid,
  pit_vendor_id         uuid,
  material              text,
  load_date             date,
  load_status           text          NOT NULL DEFAULT 'pending'
    CHECK (load_status IN ('pending','in_transit','delivered','cancelled','disputed')),
  expected_tons         numeric(10,3),
  actual_tons           numeric(10,3),
  customer_rate         numeric(10,4),   -- $ per ton (billing side)
  driver_pay_rate       numeric(10,4),   -- $ per ton (payroll side)
  billing_status        text          NOT NULL DEFAULT 'not_billed'
    CHECK (billing_status IN ('not_billed','billing_hold','ready_to_bill','invoiced','paid','dispute')),
  payroll_status        text          NOT NULL DEFAULT 'not_paid'
    CHECK (payroll_status IN ('not_paid','payroll_hold','ready_for_payroll','sent_to_payroll','paid')),
  notes                 text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asl_org        ON public.accuriscale_loads(organization_id);
CREATE INDEX IF NOT EXISTS idx_asl_load_date  ON public.accuriscale_loads(load_date);
CREATE INDEX IF NOT EXISTS idx_asl_driver     ON public.accuriscale_loads(driver_id);
CREATE INDEX IF NOT EXISTS idx_asl_billing    ON public.accuriscale_loads(billing_status);
CREATE INDEX IF NOT EXISTS idx_asl_payroll    ON public.accuriscale_loads(payroll_status);

ALTER TABLE public.accuriscale_loads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asl_select" ON public.accuriscale_loads;
DROP POLICY IF EXISTS "asl_insert" ON public.accuriscale_loads;
DROP POLICY IF EXISTS "asl_update" ON public.accuriscale_loads;
CREATE POLICY "asl_select" ON public.accuriscale_loads FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asl_insert" ON public.accuriscale_loads FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asl_update" ON public.accuriscale_loads FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 2. accuriscale_scale_tickets ────────────────────────────────────────────
-- One row per physical/digital scale ticket.

CREATE TABLE IF NOT EXISTS public.accuriscale_scale_tickets (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_number         text,
  ticket_date           date,
  pit_name              text,
  vendor_name           text,
  truck_number          text,
  driver_name           text,
  material              text,
  gross_weight          numeric(12,2),   -- lbs
  tare_weight           numeric(12,2),   -- lbs
  net_weight            numeric(12,2),   -- lbs (computed or entered)
  tons                  numeric(10,3),   -- net weight / 2000
  ticket_file_url       text,
  ocr_status            text          NOT NULL DEFAULT 'pending'
    CHECK (ocr_status IN ('pending','processing','complete','failed','skipped')),
  ocr_confidence        numeric(5,2),    -- 0-100%
  ocr_raw_data          jsonb,           -- full OCR extraction result
  source_type           text          NOT NULL DEFAULT 'manual_entry'
    CHECK (source_type IN ('ocr_upload','excel_import','pit_invoice','manual_entry','api_import')),
  is_duplicate          boolean       NOT NULL DEFAULT false,
  duplicate_of_id       uuid          REFERENCES public.accuriscale_scale_tickets(id),
  notes                 text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asst_org         ON public.accuriscale_scale_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_asst_ticket_num  ON public.accuriscale_scale_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_asst_date        ON public.accuriscale_scale_tickets(ticket_date);
CREATE INDEX IF NOT EXISTS idx_asst_ocr         ON public.accuriscale_scale_tickets(ocr_status);
CREATE INDEX IF NOT EXISTS idx_asst_duplicate   ON public.accuriscale_scale_tickets(is_duplicate);

ALTER TABLE public.accuriscale_scale_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asst_select" ON public.accuriscale_scale_tickets;
DROP POLICY IF EXISTS "asst_insert" ON public.accuriscale_scale_tickets;
DROP POLICY IF EXISTS "asst_update" ON public.accuriscale_scale_tickets;
CREATE POLICY "asst_select" ON public.accuriscale_scale_tickets FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asst_insert" ON public.accuriscale_scale_tickets FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asst_update" ON public.accuriscale_scale_tickets FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 3. accuriscale_ticket_matches ───────────────────────────────────────────
-- Connects a scale ticket to its dispatch load record.

CREATE TABLE IF NOT EXISTS public.accuriscale_ticket_matches (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id               uuid          REFERENCES public.accuriscale_loads(id) ON DELETE SET NULL,
  scale_ticket_id       uuid          REFERENCES public.accuriscale_scale_tickets(id) ON DELETE SET NULL,
  match_status          text          NOT NULL DEFAULT 'needs_review'
    CHECK (match_status IN (
      'matched','needs_review','missing_load','missing_ticket',
      'duplicate_ticket','weight_mismatch','driver_mismatch',
      'truck_mismatch','material_mismatch','rate_mismatch','rejected'
    )),
  match_score           integer,         -- 0-100 confidence
  matched_by            text,            -- 'auto' | user name
  matched_at            timestamptz,
  match_notes           text,
  reviewed_by           text,
  reviewed_at           timestamptz,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_astm_org     ON public.accuriscale_ticket_matches(organization_id);
CREATE INDEX IF NOT EXISTS idx_astm_load    ON public.accuriscale_ticket_matches(load_id);
CREATE INDEX IF NOT EXISTS idx_astm_ticket  ON public.accuriscale_ticket_matches(scale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_astm_status  ON public.accuriscale_ticket_matches(match_status);

ALTER TABLE public.accuriscale_ticket_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "astm_select" ON public.accuriscale_ticket_matches;
DROP POLICY IF EXISTS "astm_insert" ON public.accuriscale_ticket_matches;
DROP POLICY IF EXISTS "astm_update" ON public.accuriscale_ticket_matches;
CREATE POLICY "astm_select" ON public.accuriscale_ticket_matches FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "astm_insert" ON public.accuriscale_ticket_matches FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "astm_update" ON public.accuriscale_ticket_matches FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 4. accuriscale_exceptions ───────────────────────────────────────────────
-- The review queue. Every load or ticket problem lands here until resolved.

CREATE TABLE IF NOT EXISTS public.accuriscale_exceptions (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  exception_type        text          NOT NULL
    CHECK (exception_type IN (
      'short_load','missing_ticket','duplicate_ticket','weight_mismatch',
      'driver_mismatch','truck_mismatch','material_mismatch','rate_mismatch',
      'manual_override','payroll_hold','billing_hold','unbilled_ticket',
      'unmatched_ticket','missing_proof','scale_edit_detected','other'
    )),
  severity              text          NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info','warning','critical','block')),
  status                text          NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_review','resolved','dismissed','escalated')),
  load_id               uuid          REFERENCES public.accuriscale_loads(id) ON DELETE SET NULL,
  scale_ticket_id       uuid          REFERENCES public.accuriscale_scale_tickets(id) ON DELETE SET NULL,
  issue_title           text          NOT NULL,
  issue_description     text,
  assigned_role         text          DEFAULT 'office',   -- office | dispatcher | manager
  action_label          text,                             -- e.g. "Approve Short Load"
  resolution_notes      text,
  resolved_at           timestamptz,
  resolved_by           text,
  metadata              jsonb,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ase_org      ON public.accuriscale_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ase_status   ON public.accuriscale_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_ase_severity ON public.accuriscale_exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_ase_type     ON public.accuriscale_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_ase_load     ON public.accuriscale_exceptions(load_id);
CREATE INDEX IF NOT EXISTS idx_ase_ticket   ON public.accuriscale_exceptions(scale_ticket_id);

ALTER TABLE public.accuriscale_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ase_select" ON public.accuriscale_exceptions;
DROP POLICY IF EXISTS "ase_insert" ON public.accuriscale_exceptions;
DROP POLICY IF EXISTS "ase_update" ON public.accuriscale_exceptions;
CREATE POLICY "ase_select" ON public.accuriscale_exceptions FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "ase_insert" ON public.accuriscale_exceptions FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "ase_update" ON public.accuriscale_exceptions FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 5. accuriscale_activity_logs ────────────────────────────────────────────
-- Immutable audit trail for every AccuriScale action.

CREATE TABLE IF NOT EXISTS public.accuriscale_activity_logs (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type           text          NOT NULL,   -- 'load' | 'ticket' | 'match' | 'exception' | 'invoice' | 'payroll'
  entity_id             uuid,
  action                text          NOT NULL,
  performed_by          text,
  notes                 text,
  metadata              jsonb,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asal_org    ON public.accuriscale_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_asal_entity ON public.accuriscale_activity_logs(entity_type, entity_id);

ALTER TABLE public.accuriscale_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asal_select" ON public.accuriscale_activity_logs;
DROP POLICY IF EXISTS "asal_insert" ON public.accuriscale_activity_logs;
CREATE POLICY "asal_select" ON public.accuriscale_activity_logs FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asal_insert" ON public.accuriscale_activity_logs FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());


-- ─── Validate ────────────────────────────────────────────────────────────────

SELECT table_name, 'created' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accuriscale_loads',
    'accuriscale_scale_tickets',
    'accuriscale_ticket_matches',
    'accuriscale_exceptions',
    'accuriscale_activity_logs'
  )
ORDER BY table_name;
