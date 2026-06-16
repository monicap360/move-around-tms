-- Dispatch Guard™ — Daily Dispatch Import + RMIS Compliance Monitor

CREATE TABLE IF NOT EXISTS public.dispatch_imports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid,
  import_name         text NOT NULL,
  source_file_name    text,
  schedule_date       date,
  total_rows          integer DEFAULT 0,
  ready_count         integer DEFAULT 0,
  blocked_count       integer DEFAULT 0,
  needs_docs_count    integer DEFAULT 0,
  in_progress_count   integer DEFAULT 0,
  completed_count     integer DEFAULT 0,
  to_pickup_count     integer DEFAULT 0,
  to_dropoff_count    integer DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  created_by          uuid
);

CREATE TABLE IF NOT EXISTS public.dispatch_jobs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid,
  dispatch_import_id      uuid REFERENCES public.dispatch_imports(id) ON DELETE CASCADE,

  -- Schedule fields
  start_time              timestamptz,
  truck_number            text,
  vendor_name             text,
  driver_name             text,
  driver_phone            text,

  -- RMIS / Compliance
  rmis_note               text,
  rmis_status             text DEFAULT 'unknown',
  compliance_status       text DEFAULT 'needs_review',
  compliance_severity     text DEFAULT 'warning',
  compliance_issue        text,
  compliance_action       text,

  -- Equipment
  truck_id                text,
  equipment_license_number text,

  -- Job details
  customer_name           text,
  pickup_site_name        text,
  dropoff_site_name       text,
  job_service             text,
  job_status              text,
  job_quantity            numeric,
  job_quantity_unit       text DEFAULT 'Loads',
  material                text,
  friendly_job_id         text,
  dispatch_status         text,

  -- Ticket matching
  expected_ticket_count   numeric DEFAULT 0,
  scanned_ticket_count    numeric DEFAULT 0,

  -- Guard statuses
  payroll_status          text DEFAULT 'not_ready',
  billing_status          text DEFAULT 'not_ready',
  issue_code              text,
  issue_message           text,

  raw_row                 jsonb,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_import ON public.dispatch_jobs(dispatch_import_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_truck   ON public.dispatch_jobs(truck_number);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_driver  ON public.dispatch_jobs(driver_name);
CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_job_id  ON public.dispatch_jobs(friendly_job_id);

CREATE TABLE IF NOT EXISTS public.dispatch_guard_alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid,
  dispatch_import_id  uuid REFERENCES public.dispatch_imports(id) ON DELETE CASCADE,
  dispatch_job_id     uuid REFERENCES public.dispatch_jobs(id) ON DELETE CASCADE,

  severity            text NOT NULL,   -- critical | high | warning | low | clear
  alert_type          text NOT NULL,   -- missing_medical | missing_dl_back | docs_requested | needs_review | ...
  title               text NOT NULL,
  message             text,
  recommended_action  text,
  status              text DEFAULT 'open',  -- open | resolved | dismissed

  created_at          timestamptz DEFAULT now(),
  resolved_at         timestamptz,
  resolved_by         uuid
);

CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_import ON public.dispatch_guard_alerts(dispatch_import_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_alerts_status ON public.dispatch_guard_alerts(status);
