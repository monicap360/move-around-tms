-- ============================================================
-- Migration 188: Schema drift patches
--
-- Fixes 5 confirmed PostgREST 400 errors caused by columns that
-- exist in the app code but were never added to the database:
--
--   1. drivers.driver_uuid
--   2. ronyx_driver_truck_assignments.is_active
--   3. dispatch_jobs.job_number  (+ pickup_time, assigned_* etc.)
--   4. ronyx_trucks.company_name (+ carrier_name, owner_operator_* etc.)
--   5. ronyx_staff_tasks.entity_type (+ entity_id, unique index)
--
-- All ADD COLUMN IF NOT EXISTS — safe to run even if some of the
-- source migrations (107, 114, 134, 138, 140, 144, 145) already ran.
-- ============================================================


-- ── 1. drivers — add driver_uuid (used in RLS policies + upload routes) ───────

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS driver_uuid        uuid,
  ADD COLUMN IF NOT EXISTS dispatch_eligible  boolean    DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_eligible   boolean    DEFAULT false,
  ADD COLUMN IF NOT EXISTS organization_id    uuid,
  ADD COLUMN IF NOT EXISTS company_name       text,
  ADD COLUMN IF NOT EXISTS carrier_name       text,
  ADD COLUMN IF NOT EXISTS employment_type    text       DEFAULT 'W2 Driver',
  ADD COLUMN IF NOT EXISTS owner_operator_id  uuid,
  ADD COLUMN IF NOT EXISTS owner_operator_name text;

CREATE INDEX IF NOT EXISTS idx_drivers_driver_uuid ON public.drivers(driver_uuid);
CREATE INDEX IF NOT EXISTS idx_drivers_org         ON public.drivers(organization_id);


-- ── 2. ronyx_driver_truck_assignments ─────────────────────────────────────────
-- Migration 134 created this WITH is_active, priority, requires_manager_approval.
-- Migration 185 created the same table WITHOUT those columns (name clash).
-- If 185 ran first and 134 was skipped, these are missing.

ALTER TABLE public.ronyx_driver_truck_assignments
  ADD COLUMN IF NOT EXISTS is_active                  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority                   integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS requires_manager_approval  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organization_id            uuid,
  ADD COLUMN IF NOT EXISTS oo_id                      uuid,
  ADD COLUMN IF NOT EXISTS assignment_type            text    DEFAULT 'backup';

CREATE INDEX IF NOT EXISTS idx_rdta_active ON public.ronyx_driver_truck_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_rdta_oo2    ON public.ronyx_driver_truck_assignments(oo_id)
  WHERE oo_id IS NOT NULL;


-- ── 3. dispatch_jobs — all columns the app routes actually use ─────────────────
-- Migration 128 created dispatch_jobs with minimal columns.
-- Multiple later migrations (140, 144, 145, 187) added more but may not have run.
-- The dispatch/jobs route queries: pickup_time, assigned_driver_id,
-- assigned_vehicle_id, job_number, estimated_revenue, actual_revenue,
-- pickup_address, dropoff_address, risk_level, payment_status, created_by, etc.

ALTER TABLE public.dispatch_jobs
  -- Scheduling columns (used by dispatch board route ORDER BY + date filter)
  ADD COLUMN IF NOT EXISTS pickup_time          timestamptz,
  ADD COLUMN IF NOT EXISTS dropoff_time         timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_address       text,
  ADD COLUMN IF NOT EXISTS dropoff_address      text,
  ADD COLUMN IF NOT EXISTS job_number           text,
  -- Driver / vehicle FK references (used in Supabase FK join syntax)
  ADD COLUMN IF NOT EXISTS assigned_driver_id   uuid,
  ADD COLUMN IF NOT EXISTS assigned_vehicle_id  uuid,
  -- Financial
  ADD COLUMN IF NOT EXISTS estimated_revenue    numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_revenue       numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_status       text DEFAULT 'unpaid',
  -- Customer contact (posted by dispatch board new-job form)
  ADD COLUMN IF NOT EXISTS customer_phone       text,
  ADD COLUMN IF NOT EXISTS customer_email       text,
  ADD COLUMN IF NOT EXISTS passenger_count      integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS luggage_count        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS special_instructions text,
  -- Classification
  ADD COLUMN IF NOT EXISTS risk_level           text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS created_by           text,
  -- Company resolution (migration 140)
  ADD COLUMN IF NOT EXISTS company_name         text,
  ADD COLUMN IF NOT EXISTS carrier_name         text,
  ADD COLUMN IF NOT EXISTS owner_operator_id    uuid,
  ADD COLUMN IF NOT EXISTS owner_operator_name  text,
  ADD COLUMN IF NOT EXISTS company_match_status text DEFAULT 'not_set',
  ADD COLUMN IF NOT EXISTS company_match_source text,
  -- Dispatch Guard intelligence (migration 144/145/187)
  ADD COLUMN IF NOT EXISTS recommended_action   text,
  ADD COLUMN IF NOT EXISTS dispatch_guard_status text DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS rmis_classification  text,
  ADD COLUMN IF NOT EXISTS match_confidence     numeric(5,2),
  ADD COLUMN IF NOT EXISTS row_status           text DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS next_best_action     text;

CREATE INDEX IF NOT EXISTS idx_dj_pickup      ON public.dispatch_jobs(pickup_time);
CREATE INDEX IF NOT EXISTS idx_dj_driver_id   ON public.dispatch_jobs(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_dj_vehicle_id  ON public.dispatch_jobs(assigned_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_dj_job_number  ON public.dispatch_jobs(job_number);
CREATE INDEX IF NOT EXISTS idx_dj_company     ON public.dispatch_jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_dj_status2     ON public.dispatch_jobs(job_status);


-- ── 4. ronyx_trucks — company + carrier identity (migration 140) ───────────────

ALTER TABLE public.ronyx_trucks
  ADD COLUMN IF NOT EXISTS company_name         text,
  ADD COLUMN IF NOT EXISTS carrier_name         text,
  ADD COLUMN IF NOT EXISTS owner_operator_id    uuid,
  ADD COLUMN IF NOT EXISTS owner_operator_name  text,
  ADD COLUMN IF NOT EXISTS assigned_driver_id   uuid,
  ADD COLUMN IF NOT EXISTS assigned_driver_name text,
  ADD COLUMN IF NOT EXISTS company_match_status text DEFAULT 'not_set';

CREATE INDEX IF NOT EXISTS idx_rt_company    ON public.ronyx_trucks(company_name);
CREATE INDEX IF NOT EXISTS idx_rt_oo_id      ON public.ronyx_trucks(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_rt_driver_id  ON public.ronyx_trucks(assigned_driver_id);


-- ── 5. ronyx_staff_tasks — entity_type + entity_id (migration 138) ────────────
-- Also adds source_type, source_label, dispatch_import_id, driver_profile_id,
-- initials_required, notes (migration 147).
-- The POST route upserts ON CONFLICT (entity_type, entity_id, task_type).

ALTER TABLE public.ronyx_staff_tasks
  ADD COLUMN IF NOT EXISTS entity_type          text,
  ADD COLUMN IF NOT EXISTS entity_id            text,
  ADD COLUMN IF NOT EXISTS source_type          text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_label         text,
  ADD COLUMN IF NOT EXISTS dispatch_import_id   uuid,
  ADD COLUMN IF NOT EXISTS driver_profile_id    uuid,
  ADD COLUMN IF NOT EXISTS initials_required    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes                text,
  ADD COLUMN IF NOT EXISTS coi_document_id      uuid;

-- Unique index required for the upsert ON CONFLICT clause in the POST handler
CREATE UNIQUE INDEX IF NOT EXISTS ronyx_staff_tasks_entity_dedup_idx
  ON public.ronyx_staff_tasks (entity_type, entity_id, task_type)
  WHERE status IN ('open', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_rst_entity ON public.ronyx_staff_tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_rst_source ON public.ronyx_staff_tasks(source_type);


-- ── Verification ──────────────────────────────────────────────────────────────

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'drivers'                          AND column_name IN ('driver_uuid','dispatch_eligible','organization_id'))
    OR (table_name = 'ronyx_driver_truck_assignments' AND column_name IN ('is_active','priority','requires_manager_approval'))
    OR (table_name = 'dispatch_jobs'                 AND column_name IN ('job_number','pickup_time','assigned_driver_id','assigned_vehicle_id'))
    OR (table_name = 'ronyx_trucks'                  AND column_name IN ('company_name','carrier_name','owner_operator_id'))
    OR (table_name = 'ronyx_staff_tasks'             AND column_name IN ('entity_type','entity_id','source_type'))
  )
ORDER BY table_name, column_name;
