-- Migration 185: Medium-priority OO and Fast Scan tracking tables
-- Tables: ronyx_driver_truck_assignments, ronyx_oo_coi_requests,
--         ronyx_oo_subcontractor_drivers, ronyx_truck_reassignment_logs,
--         fast_scan_uploads
-- Also: extends aggregate_tickets with driver upload tracking columns

BEGIN;

-- ── 1. ronyx_driver_truck_assignments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_driver_truck_assignments (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id              uuid,
  driver_name            text,
  truck_id               uuid,
  truck_number           text,
  owner_operator_id      uuid,
  assignment_type        text        CHECK (assignment_type IN ('permanent','temporary','daily','on_call')),
  status                 text        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active','inactive','pending','released')),
  assigned_date          date,
  released_date          date,
  assigned_by            text,
  released_by            text,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rdta_org     ON public.ronyx_driver_truck_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_rdta_driver  ON public.ronyx_driver_truck_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_rdta_truck   ON public.ronyx_driver_truck_assignments(truck_id);
CREATE INDEX IF NOT EXISTS idx_rdta_status  ON public.ronyx_driver_truck_assignments(status);
CREATE INDEX IF NOT EXISTS idx_rdta_created ON public.ronyx_driver_truck_assignments(created_at);

ALTER TABLE public.ronyx_driver_truck_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rdta_tenant_select" ON public.ronyx_driver_truck_assignments
  FOR SELECT USING (organization_id = public.current_user_org());
CREATE POLICY "rdta_tenant_insert" ON public.ronyx_driver_truck_assignments
  FOR INSERT WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "rdta_tenant_update" ON public.ronyx_driver_truck_assignments
  FOR UPDATE USING (organization_id = public.current_user_org());

CREATE TRIGGER set_rdta_updated_at
  BEFORE UPDATE ON public.ronyx_driver_truck_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. ronyx_oo_coi_requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_oo_coi_requests (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_operator_id      uuid,
  oo_company_name        text,
  request_type           text        CHECK (request_type IN ('new_coi','renewal','update','additional_insured','cancel')),
  status                 text        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending','sent','received','rejected','expired','cancelled')),
  requested_by           text,
  requested_at           timestamptz DEFAULT now(),
  due_date               date,
  received_at            timestamptz,
  received_by            text,
  insurance_company      text,
  policy_number          text,
  effective_date         date,
  expiration_date        date,
  coverage_amount        numeric(14,2),
  document_url           text,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roocoi_org     ON public.ronyx_oo_coi_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_roocoi_oo      ON public.ronyx_oo_coi_requests(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_roocoi_status  ON public.ronyx_oo_coi_requests(status);
CREATE INDEX IF NOT EXISTS idx_roocoi_created ON public.ronyx_oo_coi_requests(created_at);

ALTER TABLE public.ronyx_oo_coi_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roocoi_tenant_select" ON public.ronyx_oo_coi_requests
  FOR SELECT USING (organization_id = public.current_user_org());
CREATE POLICY "roocoi_tenant_insert" ON public.ronyx_oo_coi_requests
  FOR INSERT WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "roocoi_tenant_update" ON public.ronyx_oo_coi_requests
  FOR UPDATE USING (organization_id = public.current_user_org());

CREATE TRIGGER set_roocoi_updated_at
  BEFORE UPDATE ON public.ronyx_oo_coi_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. ronyx_oo_subcontractor_drivers ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_oo_subcontractor_drivers (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_operator_id       uuid,
  oo_company_name         text,
  driver_name             text        NOT NULL,
  driver_id_external      text,
  license_number          text,
  license_state           text,
  license_class           text,
  license_expiration      date,
  cdl_verified            boolean     DEFAULT false,
  medical_card_expiration date,
  status                  text        NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active','inactive','pending_docs','suspended')),
  start_date              date,
  end_date                date,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roosd_org     ON public.ronyx_oo_subcontractor_drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_roosd_oo      ON public.ronyx_oo_subcontractor_drivers(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_roosd_status  ON public.ronyx_oo_subcontractor_drivers(status);
CREATE INDEX IF NOT EXISTS idx_roosd_created ON public.ronyx_oo_subcontractor_drivers(created_at);

ALTER TABLE public.ronyx_oo_subcontractor_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roosd_tenant_select" ON public.ronyx_oo_subcontractor_drivers
  FOR SELECT USING (organization_id = public.current_user_org());
CREATE POLICY "roosd_tenant_insert" ON public.ronyx_oo_subcontractor_drivers
  FOR INSERT WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "roosd_tenant_update" ON public.ronyx_oo_subcontractor_drivers
  FOR UPDATE USING (organization_id = public.current_user_org());

CREATE TRIGGER set_roosd_updated_at
  BEFORE UPDATE ON public.ronyx_oo_subcontractor_drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. ronyx_truck_reassignment_logs ─────────────────────────────────────────
-- Insert-only audit log: no UPDATE trigger needed
CREATE TABLE IF NOT EXISTS public.ronyx_truck_reassignment_logs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  truck_id                uuid,
  truck_number            text,
  from_driver_id          uuid,
  from_driver_name        text,
  to_driver_id            uuid,
  to_driver_name          text,
  from_owner_operator_id  uuid,
  to_owner_operator_id    uuid,
  reason                  text        CHECK (reason IN (
                                        'breakdown','reassignment','shift_change','driver_change',
                                        'availability','maintenance','emergency','other'
                                      )),
  reason_detail           text,
  reassigned_by           text,
  effective_at            timestamptz DEFAULT now(),
  job_id                  uuid,
  job_number              text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtrl_org     ON public.ronyx_truck_reassignment_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_rtrl_truck   ON public.ronyx_truck_reassignment_logs(truck_id);
CREATE INDEX IF NOT EXISTS idx_rtrl_created ON public.ronyx_truck_reassignment_logs(created_at);

ALTER TABLE public.ronyx_truck_reassignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rtrl_tenant_select" ON public.ronyx_truck_reassignment_logs
  FOR SELECT USING (organization_id = public.current_user_org());
CREATE POLICY "rtrl_tenant_insert" ON public.ronyx_truck_reassignment_logs
  FOR INSERT WITH CHECK (organization_id = public.current_user_org());

-- ── 5. fast_scan_uploads ──────────────────────────────────────────────────────
-- Tracks driver mobile + office uploads through the ticket workflow.
-- Buckets (private): ticket-uploads, ronyx-original-uploads
CREATE TABLE IF NOT EXISTS public.fast_scan_uploads (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  ticket_id                   uuid,
  ticket_number               text,
  driver_id                   uuid,
  driver_name                 text,
  truck_id                    uuid,
  truck_number                text,
  -- Who submitted (driver self-upload vs office staff)
  submitted_by_driver_id      uuid,
  uploaded_from               text        NOT NULL DEFAULT 'office_upload'
                                          CHECK (uploaded_from IN (
                                            'driver_mobile','office_upload','scanner','email','batch_upload'
                                          )),
  -- Lifecycle status
  upload_status               text        NOT NULL DEFAULT 'submitted'
                                          CHECK (upload_status IN (
                                            'submitted','processing','needs_better_photo',
                                            'needs_review','accepted','rejected','missing_original'
                                          )),
  photo_quality_status        text        CHECK (photo_quality_status IN ('good','needs_retake','rejected','pending')),
  ocr_status                  text        CHECK (ocr_status IN ('pending','processing','completed','failed','skipped')),
  ocr_confidence              numeric(5,2),
  ocr_extracted               jsonb,
  -- Original paper ticket policy
  original_ticket_required    boolean     NOT NULL DEFAULT true,
  original_ticket_received    boolean     NOT NULL DEFAULT false,
  original_ticket_received_at timestamptz,
  original_ticket_received_by text,
  original_due_date           date,
  -- Payroll & billing holds
  payroll_hold                boolean     NOT NULL DEFAULT false,
  payroll_hold_reason         text,
  billing_hold                boolean     NOT NULL DEFAULT false,
  billing_hold_reason         text,
  -- Confirmation timestamps
  driver_confirmed_at         timestamptz,
  office_reviewed_at          timestamptz,
  office_reviewed_by          text,
  -- File storage (private buckets, use signed URLs)
  storage_bucket              text        DEFAULT 'ticket-uploads',
  storage_path                text,
  file_name                   text,
  file_size_bytes             bigint,
  mime_type                   text,
  -- Dispatch / job matching
  project_id                  uuid,
  job_number                  text,
  dispatch_matched            boolean,
  dispatch_match_note         text,
  -- Weight / tons verification
  tons_expected               numeric(10,3),
  tons_actual                 numeric(10,3),
  tons_variance               numeric(10,3),
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fsu_org       ON public.fast_scan_uploads(organization_id);
CREATE INDEX IF NOT EXISTS idx_fsu_driver    ON public.fast_scan_uploads(driver_id);
CREATE INDEX IF NOT EXISTS idx_fsu_submitted ON public.fast_scan_uploads(submitted_by_driver_id);
CREATE INDEX IF NOT EXISTS idx_fsu_ticket    ON public.fast_scan_uploads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_fsu_status    ON public.fast_scan_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_fsu_created   ON public.fast_scan_uploads(created_at);

ALTER TABLE public.fast_scan_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsu_tenant_select" ON public.fast_scan_uploads
  FOR SELECT USING (organization_id = public.current_user_org());
CREATE POLICY "fsu_tenant_insert" ON public.fast_scan_uploads
  FOR INSERT WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "fsu_tenant_update" ON public.fast_scan_uploads
  FOR UPDATE USING (organization_id = public.current_user_org());

CREATE TRIGGER set_fsu_updated_at
  BEFORE UPDATE ON public.fast_scan_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Extend aggregate_tickets with driver upload tracking columns ──────────────
-- Safe: ADD COLUMN IF NOT EXISTS never fails if column already present
ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS submitted_by_driver_id      uuid,
  ADD COLUMN IF NOT EXISTS uploaded_from               text,
  ADD COLUMN IF NOT EXISTS original_ticket_required    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS original_ticket_received    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_ticket_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_ticket_received_by text,
  ADD COLUMN IF NOT EXISTS photo_quality_status        text,
  ADD COLUMN IF NOT EXISTS driver_confirmed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS office_reviewed_at          timestamptz,
  ADD COLUMN IF NOT EXISTS payroll_hold_reason         text,
  ADD COLUMN IF NOT EXISTS billing_hold_reason         text;

-- ── Validation ───────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'ronyx_driver_truck_assignments',
    'ronyx_oo_coi_requests',
    'ronyx_oo_subcontractor_drivers',
    'ronyx_truck_reassignment_logs',
    'fast_scan_uploads'
  )
ORDER BY tablename;

SELECT tablename, count(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'ronyx_driver_truck_assignments',
    'ronyx_oo_coi_requests',
    'ronyx_oo_subcontractor_drivers',
    'ronyx_truck_reassignment_logs',
    'fast_scan_uploads'
  )
GROUP BY tablename
ORDER BY tablename;

SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ronyx_driver_truck_assignments',
    'ronyx_oo_coi_requests',
    'ronyx_oo_subcontractor_drivers',
    'ronyx_truck_reassignment_logs',
    'fast_scan_uploads'
  )
GROUP BY tablename
ORDER BY tablename;

COMMIT;
