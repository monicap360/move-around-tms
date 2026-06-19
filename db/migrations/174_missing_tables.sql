-- ============================================================
-- Migration 174: Create tables referenced by API routes
--               that have no migration yet.
--
-- driver_settlement_items  — used by drivers/[id]/process-ticket and current-week routes
-- billing_review_items     — used by virtual-dispatcher route
-- dispatch_incidents       — used by virtual-dispatcher and dispatch/incidents routes
-- audit_logs               — used by audit-log API route and tickets/email
--
-- All statements use IF NOT EXISTS. Safe to re-run.
-- ============================================================


-- ------------------------------------------------------------
-- 1. driver_settlement_items
--    Per-ticket settlement line items for a driver.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_settlement_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id         uuid,
  driver_name       text,
  ticket_id         uuid,
  ticket_number     text,
  ticket_date       date,
  job_name          text,
  customer_name     text,
  material          text,
  quantity          numeric(12,4),
  unit              text        DEFAULT 'ton',
  pay_rate          numeric(10,4),
  gross_pay         numeric(12,2) DEFAULT 0,
  deductions        numeric(12,2) DEFAULT 0,
  net_pay           numeric(12,2) DEFAULT 0,
  settlement_status text        DEFAULT 'pending'
    CHECK (settlement_status IN ('pending','approved','paid','held','void')),
  week_ending       date,
  run_id            uuid,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsi_driver   ON public.driver_settlement_items(driver_id);
CREATE INDEX IF NOT EXISTS idx_dsi_ticket   ON public.driver_settlement_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_dsi_org      ON public.driver_settlement_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_dsi_status   ON public.driver_settlement_items(settlement_status);
CREATE INDEX IF NOT EXISTS idx_dsi_week     ON public.driver_settlement_items(week_ending);

ALTER TABLE public.driver_settlement_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dsi_select" ON public.driver_settlement_items;
DROP POLICY IF EXISTS "dsi_insert" ON public.driver_settlement_items;
DROP POLICY IF EXISTS "dsi_update" ON public.driver_settlement_items;

CREATE POLICY "dsi_select" ON public.driver_settlement_items
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

CREATE POLICY "dsi_insert" ON public.driver_settlement_items
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "dsi_update" ON public.driver_settlement_items
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 2. billing_review_items
--    Flagged billing items surfaced by virtual dispatcher.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.billing_review_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_id         uuid,
  ticket_number     text,
  invoice_id        uuid,
  customer_name     text,
  driver_name       text,
  truck_number      text,
  ticket_date       date,
  billed_amount     numeric(12,2),
  expected_amount   numeric(12,2),
  variance          numeric(12,2) GENERATED ALWAYS AS (billed_amount - expected_amount) STORED,
  flag_reason       text,
  flag_type         text        DEFAULT 'mismatch'
    CHECK (flag_type IN ('mismatch','duplicate','missing_ticket','missing_rate','hold','other')),
  status            text        DEFAULT 'open'
    CHECK (status IN ('open','reviewing','resolved','void')),
  resolved_by       text,
  resolved_at       timestamptz,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bri_ticket   ON public.billing_review_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_bri_status   ON public.billing_review_items(status);
CREATE INDEX IF NOT EXISTS idx_bri_org      ON public.billing_review_items(organization_id);

ALTER TABLE public.billing_review_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bri_select" ON public.billing_review_items;
DROP POLICY IF EXISTS "bri_insert" ON public.billing_review_items;
DROP POLICY IF EXISTS "bri_update" ON public.billing_review_items;

CREATE POLICY "bri_select" ON public.billing_review_items
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

CREATE POLICY "bri_insert" ON public.billing_review_items
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "bri_update" ON public.billing_review_items
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 3. dispatch_incidents
--    Incidents raised during dispatch (breakdowns, blocks, etc.)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dispatch_incidents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_type     text        DEFAULT 'breakdown'
    CHECK (incident_type IN ('breakdown','oos','compliance_block','dispatch_hold','accident','other')),
  severity          text        DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  status            text        DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  driver_id         uuid,
  driver_name       text,
  truck_id          uuid,
  truck_number      text,
  job_id            uuid,
  job_name          text,
  load_id           uuid,
  incident_date     date        DEFAULT CURRENT_DATE,
  incident_time     time,
  location          text,
  description       text,
  resolution        text,
  reported_by       text,
  assigned_to       text,
  resolved_at       timestamptz,
  notes             text,
  metadata          jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_di_status    ON public.dispatch_incidents(status);
CREATE INDEX IF NOT EXISTS idx_di_truck     ON public.dispatch_incidents(truck_id);
CREATE INDEX IF NOT EXISTS idx_di_driver    ON public.dispatch_incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_di_org       ON public.dispatch_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_di_date      ON public.dispatch_incidents(incident_date);

ALTER TABLE public.dispatch_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "di_select" ON public.dispatch_incidents;
DROP POLICY IF EXISTS "di_insert" ON public.dispatch_incidents;
DROP POLICY IF EXISTS "di_update" ON public.dispatch_incidents;

CREATE POLICY "di_select" ON public.dispatch_incidents
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

CREATE POLICY "di_insert" ON public.dispatch_incidents
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "di_update" ON public.dispatch_incidents
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 4. audit_logs
--    General-purpose audit trail for all entity actions.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE SET NULL,
  entity_type       text        NOT NULL,
  entity_id         uuid,
  entity_name       text,
  action            text        NOT NULL,
  performed_by      uuid,
  performed_by_name text,
  old_values        jsonb,
  new_values        jsonb,
  notes             text,
  metadata          jsonb,
  ip_address        inet,
  user_agent        text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_al_entity    ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_al_action    ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_al_org       ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_al_created   ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_performer ON public.audit_logs(performed_by);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
DROP POLICY IF EXISTS "al_insert" ON public.audit_logs;

CREATE POLICY "al_select" ON public.audit_logs
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

-- Audit logs are insert-only from the app (no update/delete)
CREATE POLICY "al_insert" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    organization_id = public.current_user_org() OR organization_id IS NULL
  );

-- Service role can always write audit logs (bypasses RLS)


-- ------------------------------------------------------------
-- 5. Validate
-- ------------------------------------------------------------

SELECT table_name, 'exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'driver_settlement_items', 'billing_review_items',
    'dispatch_incidents', 'audit_logs'
  )
ORDER BY table_name;
