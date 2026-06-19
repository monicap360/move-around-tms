-- ============================================================
-- Migration 184: Missing high-priority operational tables
--
-- All IF NOT EXISTS / safe DROP POLICY. Safe to re-run.
-- Requires: organizations, public.current_user_org(),
--           public.set_updated_at() (from migration 031)
--
-- Tables:
--   1. maintenance_units
--   2. maintenance_work_orders
--   3. maintenance_documents
--   4. maintenance_activity_log
--   5. ronyx_maintenance_events
--   6. dispatch_assignments
--   7. dispatch_notes
--   8. ronyx_projects
-- ============================================================


-- ─── 1. maintenance_units ────────────────────────────────────────────────────
-- Fleet units tracked by the maintenance module.
-- Serves /maintenance/units routes.

CREATE TABLE IF NOT EXISTS public.maintenance_units (
  id                        uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid           REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_number               text           NOT NULL,
  unit_type                 text           NOT NULL DEFAULT 'Truck',
  vin                       text,
  plate                     text,
  year                      integer,
  make                      text,
  model                     text,
  color                     text,
  assigned_driver_id        uuid,
  -- Odometer / hours
  odometer                  numeric(12,2)  NOT NULL DEFAULT 0,
  odometer_unit             text           NOT NULL DEFAULT 'miles' CHECK (odometer_unit IN ('miles','km')),
  engine_hours              numeric(10,2),
  -- Service dates
  last_service_date         date,
  last_service_odometer     numeric(12,2),
  next_service_date         date,
  next_service_miles        numeric(12,2)  NOT NULL DEFAULT 0,
  -- Compliance expiry dates
  registration_expires      date,
  insurance_expires         date,
  annual_inspection_expires date,
  dot_inspection_expires    date,
  -- Status
  status                    text           NOT NULL DEFAULT 'Ready'
    CHECK (status IN ('Ready','In Shop','Out of Service','Awaiting Parts','Retired','On Hold')),
  dispatch_eligible         boolean        NOT NULL DEFAULT true,
  dispatch_hold_reason      text,
  notes                     text,
  created_at                timestamptz    NOT NULL DEFAULT now(),
  updated_at                timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mu_org      ON public.maintenance_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_mu_status   ON public.maintenance_units(status);
CREATE INDEX IF NOT EXISTS idx_mu_number   ON public.maintenance_units(unit_number);
CREATE INDEX IF NOT EXISTS idx_mu_dispatch ON public.maintenance_units(dispatch_eligible);

ALTER TABLE public.maintenance_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mu_select" ON public.maintenance_units;
DROP POLICY IF EXISTS "mu_insert" ON public.maintenance_units;
DROP POLICY IF EXISTS "mu_update" ON public.maintenance_units;
DROP POLICY IF EXISTS "mu_delete" ON public.maintenance_units;
CREATE POLICY "mu_select" ON public.maintenance_units FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mu_insert" ON public.maintenance_units FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mu_update" ON public.maintenance_units FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mu_delete" ON public.maintenance_units FOR DELETE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);

DROP TRIGGER IF EXISTS set_updated_at_maintenance_units ON public.maintenance_units;
CREATE TRIGGER set_updated_at_maintenance_units
  BEFORE UPDATE ON public.maintenance_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 2. maintenance_work_orders ──────────────────────────────────────────────
-- Repair and service work orders per unit.
-- Serves /maintenance/work-orders routes.

CREATE TABLE IF NOT EXISTS public.maintenance_work_orders (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid           REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id         uuid           REFERENCES public.maintenance_units(id) ON DELETE CASCADE,
  -- Identity
  wo_number       text,
  issue           text           NOT NULL,
  description     text,
  -- Priority / status
  priority        text           NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low','Medium','High','Critical')),
  status          text           NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open','In Progress','Waiting Parts','Completed','Cancelled')),
  -- Dates
  opened_date     date           NOT NULL DEFAULT CURRENT_DATE,
  due_date        date,
  completed_date  date,
  -- Vendor / cost
  vendor          text,
  vendor_contact  text,
  estimated_cost  numeric(12,2)  NOT NULL DEFAULT 0,
  actual_cost     numeric(12,2),
  parts_cost      numeric(12,2),
  labor_cost      numeric(12,2),
  -- Assignment
  assigned_to     text,
  completed_by    text,
  approved_by     text,
  -- Mileage at WO open
  odometer_at_open numeric(12,2),
  notes           text,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mwo_unit   ON public.maintenance_work_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_mwo_status ON public.maintenance_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_mwo_org    ON public.maintenance_work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_mwo_opened ON public.maintenance_work_orders(opened_date DESC);

ALTER TABLE public.maintenance_work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mwo_select" ON public.maintenance_work_orders;
DROP POLICY IF EXISTS "mwo_insert" ON public.maintenance_work_orders;
DROP POLICY IF EXISTS "mwo_update" ON public.maintenance_work_orders;
CREATE POLICY "mwo_select" ON public.maintenance_work_orders FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mwo_insert" ON public.maintenance_work_orders FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mwo_update" ON public.maintenance_work_orders FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);

DROP TRIGGER IF EXISTS set_updated_at_maintenance_work_orders ON public.maintenance_work_orders;
CREATE TRIGGER set_updated_at_maintenance_work_orders
  BEFORE UPDATE ON public.maintenance_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 3. maintenance_documents ────────────────────────────────────────────────
-- Files attached to units or work orders (uploaded to maintenance-docs bucket).

CREATE TABLE IF NOT EXISTS public.maintenance_documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id         uuid        REFERENCES public.maintenance_units(id) ON DELETE CASCADE,
  work_order_id   uuid        REFERENCES public.maintenance_work_orders(id) ON DELETE SET NULL,
  document_type   text        NOT NULL DEFAULT 'General',
  file_name       text        NOT NULL,
  file_url        text        NOT NULL,
  file_size_bytes bigint,
  mime_type       text,
  expires_at      date,
  uploaded_by     text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_md_unit ON public.maintenance_documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_md_wo   ON public.maintenance_documents(work_order_id);
CREATE INDEX IF NOT EXISTS idx_md_org  ON public.maintenance_documents(organization_id);

ALTER TABLE public.maintenance_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "md_select" ON public.maintenance_documents;
DROP POLICY IF EXISTS "md_insert" ON public.maintenance_documents;
DROP POLICY IF EXISTS "md_delete" ON public.maintenance_documents;
CREATE POLICY "md_select" ON public.maintenance_documents FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "md_insert" ON public.maintenance_documents FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "md_delete" ON public.maintenance_documents FOR DELETE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 4. maintenance_activity_log ─────────────────────────────────────────────
-- Insert-only audit trail for unit and work order state changes.

CREATE TABLE IF NOT EXISTS public.maintenance_activity_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id         uuid        REFERENCES public.maintenance_units(id) ON DELETE CASCADE,
  work_order_id   uuid        REFERENCES public.maintenance_work_orders(id) ON DELETE SET NULL,
  action          text        NOT NULL,
  old_value       text,
  new_value       text,
  field_changed   text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mal_unit ON public.maintenance_activity_log(unit_id);
CREATE INDEX IF NOT EXISTS idx_mal_wo   ON public.maintenance_activity_log(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mal_org  ON public.maintenance_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_mal_time ON public.maintenance_activity_log(created_at DESC);

ALTER TABLE public.maintenance_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mal_select" ON public.maintenance_activity_log;
DROP POLICY IF EXISTS "mal_insert" ON public.maintenance_activity_log;
CREATE POLICY "mal_select" ON public.maintenance_activity_log FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "mal_insert" ON public.maintenance_activity_log FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 5. ronyx_maintenance_events ─────────────────────────────────────────────
-- OO truck breakdown, out-of-service, and return-to-service events.
-- Serves /maintenance-events routes.

CREATE TABLE IF NOT EXISTS public.ronyx_maintenance_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- References (plain uuid — parent table types confirmed via route inspection)
  oo_id               uuid,
  truck_id            uuid,
  truck_number        text,
  oo_company_name     text,
  -- Event
  event_type          text        NOT NULL
    CHECK (event_type IN (
      'breakdown','out_of_service','inspection_failed',
      'scheduled_maintenance','repair_complete','returned_to_service','other'
    )),
  severity            text        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  issue_title         text        NOT NULL,
  issue_description   text,
  -- Status
  status              text        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  out_of_service      boolean     NOT NULL DEFAULT false,
  out_of_service_at   timestamptz,
  estimated_return_at timestamptz,
  resolved_at         timestamptz,
  resolved_by         text,
  reported_by         text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rme_org    ON public.ronyx_maintenance_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_rme_oo     ON public.ronyx_maintenance_events(oo_id);
CREATE INDEX IF NOT EXISTS idx_rme_truck  ON public.ronyx_maintenance_events(truck_id);
CREATE INDEX IF NOT EXISTS idx_rme_status ON public.ronyx_maintenance_events(status);
CREATE INDEX IF NOT EXISTS idx_rme_type   ON public.ronyx_maintenance_events(event_type);

ALTER TABLE public.ronyx_maintenance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rme_select" ON public.ronyx_maintenance_events;
DROP POLICY IF EXISTS "rme_insert" ON public.ronyx_maintenance_events;
DROP POLICY IF EXISTS "rme_update" ON public.ronyx_maintenance_events;
CREATE POLICY "rme_select" ON public.ronyx_maintenance_events FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rme_insert" ON public.ronyx_maintenance_events FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rme_update" ON public.ronyx_maintenance_events FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);

DROP TRIGGER IF EXISTS set_updated_at_ronyx_maintenance_events ON public.ronyx_maintenance_events;
CREATE TRIGGER set_updated_at_ronyx_maintenance_events
  BEFORE UPDATE ON public.ronyx_maintenance_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 6. dispatch_assignments ─────────────────────────────────────────────────
-- Driver + vehicle assignment record per dispatch job.
-- UNIQUE (job_id, driver_id) matches the upsert in /dispatch/jobs/[id] route.

CREATE TABLE IF NOT EXISTS public.dispatch_assignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Job / trip reference
  job_id            uuid        NOT NULL,
  -- Driver / vehicle assignment
  driver_id         uuid        NOT NULL,
  vehicle_id        uuid,
  assigned_by       text,
  -- Status
  acceptance_status text        NOT NULL DEFAULT 'sent'
    CHECK (acceptance_status IN ('sent','accepted','declined','no_response','cancelled','released')),
  -- Timestamps
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz,
  accepted_at       timestamptz,
  declined_at       timestamptz,
  no_response_at    timestamptz,
  released_at       timestamptz,
  -- Hold / release
  on_hold           boolean     NOT NULL DEFAULT false,
  hold_reason       text,
  hold_placed_at    timestamptz,
  hold_released_at  timestamptz,
  hold_released_by  text,
  -- Dispatch notes on the assignment itself
  dispatch_note     text,
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

DROP TRIGGER IF EXISTS set_updated_at_dispatch_assignments ON public.dispatch_assignments;
CREATE TRIGGER set_updated_at_dispatch_assignments
  BEFORE UPDATE ON public.dispatch_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 7. dispatch_notes ───────────────────────────────────────────────────────
-- Dispatcher / manager notes attached to a job.
-- Serves /dispatch/notes route.

CREATE TABLE IF NOT EXISTS public.dispatch_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Job / assignment reference
  job_id          uuid        NOT NULL,
  assignment_id   uuid,
  -- Note content
  note_type       text        NOT NULL DEFAULT 'general'
    CHECK (note_type IN ('general','customer','driver','manager','payment','delay','complaint','compliance','internal')),
  body            text        NOT NULL,
  -- Visibility
  visibility      text        NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal','driver','customer','all')),
  -- Author
  created_by      text        NOT NULL DEFAULT 'dispatch',
  created_by_id   uuid,
  is_pinned       boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dn_job    ON public.dispatch_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_dn_assign ON public.dispatch_notes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_dn_org    ON public.dispatch_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_dn_time   ON public.dispatch_notes(created_at DESC);

ALTER TABLE public.dispatch_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dn_select" ON public.dispatch_notes;
DROP POLICY IF EXISTS "dn_insert" ON public.dispatch_notes;
DROP POLICY IF EXISTS "dn_update" ON public.dispatch_notes;
CREATE POLICY "dn_select" ON public.dispatch_notes FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "dn_insert" ON public.dispatch_notes FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "dn_update" ON public.dispatch_notes FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);


-- ─── 8. ronyx_projects ───────────────────────────────────────────────────────
-- Customer projects used to group jobs, loads, billing, and payroll.
-- Serves /projects route.

CREATE TABLE IF NOT EXISTS public.ronyx_projects (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid           REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Identity
  project_number      text,
  project_name        text           NOT NULL,
  -- Customer (plain uuid — ronyx_customers table confirmed)
  customer_id         uuid,
  customer_name       text,
  -- Job site
  job_site_id         uuid,
  job_site_name       text,
  job_site_address    text,
  -- Status / dates
  status              text           NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','on_hold','completed','cancelled','bidding')),
  start_date          date,
  estimated_end_date  date,
  actual_end_date     date,
  -- Material / quantity
  material            text,
  target_quantity     numeric(14,3),
  quantity_unit       text           DEFAULT 'ton',
  -- Rates
  customer_rate       numeric(10,4),
  driver_pay_rate     numeric(10,4),
  rate_unit           text           DEFAULT 'ton',
  -- Financials
  contract_amount     numeric(14,2),
  budget              numeric(14,2),
  -- Billing / payroll status
  billing_status      text           NOT NULL DEFAULT 'pending'
    CHECK (billing_status IN ('pending','in_progress','invoiced','paid','disputed','on_hold')),
  payroll_status      text           NOT NULL DEFAULT 'pending'
    CHECK (payroll_status IN ('pending','in_progress','paid','on_hold')),
  -- Notes
  notes               text,
  internal_notes      text,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_org      ON public.ronyx_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_rp_customer ON public.ronyx_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_rp_status   ON public.ronyx_projects(status);
CREATE INDEX IF NOT EXISTS idx_rp_billing  ON public.ronyx_projects(billing_status);
CREATE INDEX IF NOT EXISTS idx_rp_payroll  ON public.ronyx_projects(payroll_status);

ALTER TABLE public.ronyx_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp_select" ON public.ronyx_projects;
DROP POLICY IF EXISTS "rp_insert" ON public.ronyx_projects;
DROP POLICY IF EXISTS "rp_update" ON public.ronyx_projects;
DROP POLICY IF EXISTS "rp_delete" ON public.ronyx_projects;
CREATE POLICY "rp_select" ON public.ronyx_projects FOR SELECT TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rp_insert" ON public.ronyx_projects FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rp_update" ON public.ronyx_projects FOR UPDATE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL) WITH CHECK (organization_id = public.current_user_org() OR organization_id IS NULL);
CREATE POLICY "rp_delete" ON public.ronyx_projects FOR DELETE TO authenticated USING (organization_id = public.current_user_org() OR organization_id IS NULL);

DROP TRIGGER IF EXISTS set_updated_at_ronyx_projects ON public.ronyx_projects;
CREATE TRIGGER set_updated_at_ronyx_projects
  BEFORE UPDATE ON public.ronyx_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── Validation ──────────────────────────────────────────────────────────────
-- Proves all 8 tables exist, RLS is enabled, and indexes/policies were created.

SELECT
  t.table_name,
  CASE WHEN c.relrowsecurity THEN 'RLS ON' ELSE 'RLS OFF' END AS rls_status,
  'exists' AS table_status
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'maintenance_units',
    'maintenance_work_orders',
    'maintenance_documents',
    'maintenance_activity_log',
    'ronyx_maintenance_events',
    'dispatch_assignments',
    'dispatch_notes',
    'ronyx_projects'
  )
ORDER BY t.table_name;

-- Index count per table
SELECT
  tablename,
  COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'maintenance_units','maintenance_work_orders','maintenance_documents',
    'maintenance_activity_log','ronyx_maintenance_events',
    'dispatch_assignments','dispatch_notes','ronyx_projects'
  )
GROUP BY tablename
ORDER BY tablename;

-- Policy count per table
SELECT
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'maintenance_units','maintenance_work_orders','maintenance_documents',
    'maintenance_activity_log','ronyx_maintenance_events',
    'dispatch_assignments','dispatch_notes','ronyx_projects'
  )
GROUP BY tablename
ORDER BY tablename;
