-- ============================================================
-- Migration 184: Missing operational tables
--
-- Creates tables referenced by API routes that have no migration.
-- All IF NOT EXISTS. Safe to re-run.
--
-- Tables:
--   maintenance_units          — fleet units tracked by maintenance module
--   maintenance_work_orders    — repair/service work orders per unit
--   maintenance_documents      — files attached to units or work orders
--   maintenance_activity_log   — audit trail for unit state changes
--   ronyx_maintenance_events   — OO truck breakdown / out-of-service events
--   dispatch_assignments       — driver assignment records per job
--   dispatch_notes             — dispatcher notes attached to a job
--   trip_status_history        — job status change audit trail
--   ronyx_projects             — customer projects / job groupings
-- ============================================================


-- ─── 1. maintenance_units ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_units (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid          REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_number               text          NOT NULL,
  unit_type                 text          NOT NULL DEFAULT 'Truck',
  vin                       text,
  plate                     text,
  assigned_driver_id        uuid,
  odometer                  numeric(12,2) DEFAULT 0,
  last_service_date         date,
  next_service_date         date,
  next_service_miles        numeric(12,2) DEFAULT 0,
  registration_expires      date,
  insurance_expires         date,
  annual_inspection_expires date,
  status                    text          NOT NULL DEFAULT 'Ready'
    CHECK (status IN ('Ready','In Shop','Out of Service','Awaiting Parts','Retired')),
  dispatch_eligible         boolean       NOT NULL DEFAULT true,
  notes                     text,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mu_org    ON public.maintenance_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_mu_status ON public.maintenance_units(status);
CREATE INDEX IF NOT EXISTS idx_mu_unit   ON public.maintenance_units(unit_number);

ALTER TABLE public.maintenance_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mu_select" ON public.maintenance_units;
DROP POLICY IF EXISTS "mu_insert" ON public.maintenance_units;
DROP POLICY IF EXISTS "mu_update" ON public.maintenance_units;
DROP POLICY IF EXISTS "mu_delete" ON public.maintenance_units;
CREATE POLICY "mu_select" ON public.maintenance_units FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mu_insert" ON public.maintenance_units FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mu_update" ON public.maintenance_units FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mu_delete" ON public.maintenance_units FOR DELETE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 2. maintenance_work_orders ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_work_orders (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid         REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id        uuid          REFERENCES public.maintenance_units(id) ON DELETE CASCADE,
  issue          text          NOT NULL,
  priority       text          NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low','Medium','High','Critical')),
  status         text          NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open','In Progress','Waiting Parts','Completed','Cancelled')),
  opened_date    date          NOT NULL DEFAULT CURRENT_DATE,
  due_date       date,
  vendor         text,
  estimated_cost numeric(12,2) DEFAULT 0,
  actual_cost    numeric(12,2),
  notes          text,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mwo_unit   ON public.maintenance_work_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_mwo_status ON public.maintenance_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_mwo_org    ON public.maintenance_work_orders(organization_id);

ALTER TABLE public.maintenance_work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mwo_select" ON public.maintenance_work_orders;
DROP POLICY IF EXISTS "mwo_insert" ON public.maintenance_work_orders;
DROP POLICY IF EXISTS "mwo_update" ON public.maintenance_work_orders;
CREATE POLICY "mwo_select" ON public.maintenance_work_orders FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mwo_insert" ON public.maintenance_work_orders FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mwo_update" ON public.maintenance_work_orders FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 3. maintenance_documents ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid      REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id       uuid        REFERENCES public.maintenance_units(id) ON DELETE CASCADE,
  work_order_id uuid        REFERENCES public.maintenance_work_orders(id) ON DELETE SET NULL,
  document_type text        NOT NULL DEFAULT 'General',
  file_name     text        NOT NULL,
  file_url      text        NOT NULL,
  expires_at    date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_md_unit ON public.maintenance_documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_md_org  ON public.maintenance_documents(organization_id);

ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "md_select" ON public.maintenance_documents;
DROP POLICY IF EXISTS "md_insert" ON public.maintenance_documents;
CREATE POLICY "md_select" ON public.maintenance_documents FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "md_insert" ON public.maintenance_documents FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 4. maintenance_activity_log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_activity_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid      REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id       uuid        REFERENCES public.maintenance_units(id) ON DELETE CASCADE,
  work_order_id uuid        REFERENCES public.maintenance_work_orders(id) ON DELETE SET NULL,
  action        text        NOT NULL,
  old_value     text,
  new_value     text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mal_unit ON public.maintenance_activity_log(unit_id);
CREATE INDEX IF NOT EXISTS idx_mal_org  ON public.maintenance_activity_log(organization_id);

ALTER TABLE public.maintenance_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mal_select" ON public.maintenance_activity_log;
DROP POLICY IF EXISTS "mal_insert" ON public.maintenance_activity_log;
CREATE POLICY "mal_select" ON public.maintenance_activity_log FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mal_insert" ON public.maintenance_activity_log FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 5. ronyx_maintenance_events ─────────────────────────────────────────────
-- OO truck breakdown and out-of-service events.

CREATE TABLE IF NOT EXISTS public.ronyx_maintenance_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  oo_id               uuid,                          -- FK to owner_operators when available
  truck_id            uuid,                          -- FK to ronyx_oo_trucks when available
  truck_number        text,
  oo_company_name     text,
  event_type          text        NOT NULL
    CHECK (event_type IN (
      'breakdown','out_of_service','inspection_failed',
      'scheduled_maintenance','repair_complete','returned_to_service','other'
    )),
  severity            text        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  issue_title         text        NOT NULL,
  issue_description   text,
  status              text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  out_of_service      boolean     NOT NULL DEFAULT false,
  out_of_service_at   timestamptz,
  estimated_return_at timestamptz,
  resolved_at         timestamptz,
  reported_by         text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rme_org    ON public.ronyx_maintenance_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_rme_oo     ON public.ronyx_maintenance_events(oo_id);
CREATE INDEX IF NOT EXISTS idx_rme_truck  ON public.ronyx_maintenance_events(truck_id);
CREATE INDEX IF NOT EXISTS idx_rme_status ON public.ronyx_maintenance_events(status);

ALTER TABLE public.ronyx_maintenance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rme_select" ON public.ronyx_maintenance_events;
DROP POLICY IF EXISTS "rme_insert" ON public.ronyx_maintenance_events;
DROP POLICY IF EXISTS "rme_update" ON public.ronyx_maintenance_events;
CREATE POLICY "rme_select" ON public.ronyx_maintenance_events FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rme_insert" ON public.ronyx_maintenance_events FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rme_update" ON public.ronyx_maintenance_events FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 6. dispatch_assignments ─────────────────────────────────────────────────
-- Driver assignment record per dispatch job.
-- ON CONFLICT (job_id, driver_id) used by upsert in dispatch/jobs/[id] route.

CREATE TABLE IF NOT EXISTS public.dispatch_assignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id            uuid        NOT NULL,            -- FK to dispatch_jobs
  driver_id         uuid        NOT NULL,
  vehicle_id        uuid,
  assigned_by       text,
  acceptance_status text        NOT NULL DEFAULT 'sent'
    CHECK (acceptance_status IN ('sent','accepted','declined','no_response','cancelled')),
  sent_at           timestamptz,
  accepted_at       timestamptz,
  declined_at       timestamptz,
  no_response_at    timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_da_job    ON public.dispatch_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_da_driver ON public.dispatch_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_da_status ON public.dispatch_assignments(acceptance_status);
CREATE INDEX IF NOT EXISTS idx_da_org    ON public.dispatch_assignments(organization_id);

ALTER TABLE public.dispatch_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "da_select" ON public.dispatch_assignments;
DROP POLICY IF EXISTS "da_insert" ON public.dispatch_assignments;
DROP POLICY IF EXISTS "da_update" ON public.dispatch_assignments;
CREATE POLICY "da_select" ON public.dispatch_assignments FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "da_insert" ON public.dispatch_assignments FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "da_update" ON public.dispatch_assignments FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 7. dispatch_notes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dispatch_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          uuid        NOT NULL,              -- FK to dispatch_jobs
  category        text        NOT NULL DEFAULT 'internal'
    CHECK (category IN ('customer','driver','manager','payment','delay','complaint','internal')),
  body            text        NOT NULL,
  created_by      text        NOT NULL DEFAULT 'dispatch',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dn_job ON public.dispatch_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_dn_org ON public.dispatch_notes(organization_id);

ALTER TABLE public.dispatch_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dn_select" ON public.dispatch_notes;
DROP POLICY IF EXISTS "dn_insert" ON public.dispatch_notes;
CREATE POLICY "dn_select" ON public.dispatch_notes FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "dn_insert" ON public.dispatch_notes FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 8. trip_status_history ──────────────────────────────────────────────────
-- Audit trail for every job_status change on a dispatch job.

CREATE TABLE IF NOT EXISTS public.trip_status_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          uuid        NOT NULL,              -- FK to dispatch_jobs
  from_status     text,
  to_status       text        NOT NULL,
  changed_by      text        NOT NULL DEFAULT 'dispatch',
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsh_job ON public.trip_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_tsh_org ON public.trip_status_history(organization_id);

ALTER TABLE public.trip_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tsh_select" ON public.trip_status_history;
DROP POLICY IF EXISTS "tsh_insert" ON public.trip_status_history;
CREATE POLICY "tsh_select" ON public.trip_status_history FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "tsh_insert" ON public.trip_status_history FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 9. ronyx_projects ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ronyx_projects (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_name        text        NOT NULL,
  customer_id         uuid,                          -- FK to ronyx_customers
  customer_name       text,
  status              text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','on_hold','completed','cancelled')),
  start_date          date,
  estimated_end_date  date,
  actual_end_date     date,
  budget              numeric(14,2),
  contract_amount     numeric(14,2),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_org      ON public.ronyx_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_rp_customer ON public.ronyx_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_rp_status   ON public.ronyx_projects(status);

ALTER TABLE public.ronyx_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp_select" ON public.ronyx_projects;
DROP POLICY IF EXISTS "rp_insert" ON public.ronyx_projects;
DROP POLICY IF EXISTS "rp_update" ON public.ronyx_projects;
CREATE POLICY "rp_select" ON public.ronyx_projects FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rp_insert" ON public.ronyx_projects FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rp_update" ON public.ronyx_projects FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── Validate ─────────────────────────────────────────────────────────────────

SELECT table_name, 'created' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'maintenance_units',
    'maintenance_work_orders',
    'maintenance_documents',
    'maintenance_activity_log',
    'ronyx_maintenance_events',
    'dispatch_assignments',
    'dispatch_notes',
    'trip_status_history',
    'ronyx_projects'
  )
ORDER BY table_name;
