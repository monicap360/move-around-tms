-- Migration 212: Operational and support tables.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS throughout).
-- Note: delivery_proofs already exists in 068; IF NOT EXISTS is safe.

-- ─── 1. invoice_payment_methods ──────────────────────────────────────────────
create table if not exists public.invoice_payment_methods (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  invoice_id      uuid references public.invoices(id) on delete cascade,
  method_type     text not null check (method_type in ('ach','check','credit_card','eft','cash','other')),
  account_number  text,
  routing_number  text,
  status          text not null default 'pending',
  processed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists invoice_payment_methods_org_idx     on public.invoice_payment_methods(organization_id);
create index if not exists invoice_payment_methods_invoice_idx on public.invoice_payment_methods(invoice_id);

-- ─── 2. audit_log (comprehensive audit trail) ────────────────────────────────
create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text not null,
  entity_id       text,
  action          text not null,
  old_value       jsonb,
  new_value       jsonb,
  changed_by      uuid,
  changed_by_name text,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index if not exists audit_log_org_idx    on public.audit_log(organization_id);
create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index if not exists audit_log_time_idx   on public.audit_log(created_at desc);

-- ─── 3. rate_sheets ──────────────────────────────────────────────────────────
create table if not exists public.rate_sheets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name            text not null,
  version         integer not null default 1,
  effective_date  date not null,
  expires_at      date,
  material_type   text,
  status          text not null default 'active',
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists rate_sheets_org_idx    on public.rate_sheets(organization_id);
create index if not exists rate_sheets_status_idx on public.rate_sheets(status);

-- ─── 4. rate_sheet_lines ─────────────────────────────────────────────────────
create table if not exists public.rate_sheet_lines (
  id              uuid primary key default gen_random_uuid(),
  rate_sheet_id   uuid references public.rate_sheets(id) on delete cascade,
  material_type   text,
  unit_type       text,
  base_rate       numeric(12,4) not null,
  min_charge      numeric(12,2),
  surcharge_pct   numeric(5,2) default 0,
  surcharge_amt   numeric(12,2),
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists rate_sheet_lines_sheet_idx on public.rate_sheet_lines(rate_sheet_id);

-- ─── 5. load_statuses ────────────────────────────────────────────────────────
create table if not exists public.load_statuses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  load_id         text not null,
  status          text not null,
  notes           text,
  changed_by      uuid,
  changed_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists load_statuses_load_idx on public.load_statuses(load_id);
create index if not exists load_statuses_org_idx  on public.load_statuses(organization_id);

-- ─── 6. shipping_instructions ────────────────────────────────────────────────
create table if not exists public.shipping_instructions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  load_id          text not null,
  customer_id      text,
  instruction_type text not null default 'general',
  content          text,
  priority         text default 'normal',
  status           text default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists shipping_instructions_load_idx on public.shipping_instructions(load_id);
create index if not exists shipping_instructions_org_idx  on public.shipping_instructions(organization_id);

-- ─── 7. dispatch_exceptions ──────────────────────────────────────────────────
create table if not exists public.dispatch_exceptions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  load_id         text,
  driver_id       text,
  exception_type  text not null,
  severity        text not null default 'warning',
  description     text,
  status          text not null default 'open',
  resolved_at     timestamptz,
  resolved_by     uuid,
  created_at      timestamptz not null default now()
);
create index if not exists dispatch_exceptions_org_idx    on public.dispatch_exceptions(organization_id);
create index if not exists dispatch_exceptions_status_idx on public.dispatch_exceptions(status);

-- ─── 8. vehicle_inspections ──────────────────────────────────────────────────
create table if not exists public.vehicle_inspections (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  truck_id        uuid,
  driver_id       uuid,
  inspection_type text not null check (inspection_type in ('pre-trip','post-trip','maintenance')),
  status          text not null default 'satisfactory',
  mileage         integer,
  inspection_date date not null,
  notes           text,
  signature_url   text,
  created_at      timestamptz not null default now()
);
create index if not exists vehicle_inspections_truck_idx  on public.vehicle_inspections(truck_id);
create index if not exists vehicle_inspections_driver_idx on public.vehicle_inspections(driver_id);
create index if not exists vehicle_inspections_org_idx    on public.vehicle_inspections(organization_id);

-- ─── 9. vehicle_defects ──────────────────────────────────────────────────────
create table if not exists public.vehicle_defects (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid references public.vehicle_inspections(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  defect_type     text not null,
  location        text,
  severity        text not null default 'minor',
  description     text,
  corrected       boolean default false,
  corrected_at    timestamptz,
  corrected_by    text,
  created_at      timestamptz not null default now()
);
create index if not exists vehicle_defects_inspection_idx on public.vehicle_defects(inspection_id);
create index if not exists vehicle_defects_org_idx        on public.vehicle_defects(organization_id);

-- ─── 10. customer_portal_users ───────────────────────────────────────────────
create table if not exists public.customer_portal_users (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  customer_id     text,
  email           text not null,
  full_name       text,
  role            text not null default 'viewer',
  status          text not null default 'active',
  last_login      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists customer_portal_users_org_idx      on public.customer_portal_users(organization_id);
create index if not exists customer_portal_users_customer_idx on public.customer_portal_users(customer_id);

-- ─── 11. customer_portal_sessions ────────────────────────────────────────────
create table if not exists public.customer_portal_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.customer_portal_users(id) on delete cascade,
  token         text unique not null,
  ip_address    inet,
  user_agent    text,
  expires_at    timestamptz not null,
  last_activity timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists customer_portal_sessions_user_idx  on public.customer_portal_sessions(user_id);
create index if not exists customer_portal_sessions_token_idx on public.customer_portal_sessions(token);

-- ─── 12. document_templates ──────────────────────────────────────────────────
create table if not exists public.document_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  name             text not null,
  doc_type         text not null,
  template_content text,
  status           text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists document_templates_org_idx  on public.document_templates(organization_id);
create index if not exists document_templates_type_idx on public.document_templates(doc_type);

-- ─── 13. report_schedules ────────────────────────────────────────────────────
create table if not exists public.report_schedules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  report_name     text not null,
  frequency       text not null check (frequency in ('daily','weekly','monthly','quarterly','yearly')),
  recipients      text[] not null default '{}',
  status          text not null default 'active',
  last_run        timestamptz,
  next_run        timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists report_schedules_org_idx on public.report_schedules(organization_id);

-- ─── 14. report_runs ─────────────────────────────────────────────────────────
create table if not exists public.report_runs (
  id              uuid primary key default gen_random_uuid(),
  schedule_id     uuid references public.report_schedules(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  file_url        text,
  status          text not null default 'pending',
  error_message   text,
  executed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists report_runs_schedule_idx on public.report_runs(schedule_id);
create index if not exists report_runs_org_idx      on public.report_runs(organization_id);

-- ─── 15. geofence_alerts ─────────────────────────────────────────────────────
create table if not exists public.geofence_alerts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  geofence_id     text,
  truck_id        text,
  driver_id       text,
  event_type      text not null check (event_type in ('enter','exit')),
  event_time      timestamptz not null,
  latitude        numeric(10,6),
  longitude       numeric(10,6),
  created_at      timestamptz not null default now()
);
create index if not exists geofence_alerts_org_idx   on public.geofence_alerts(organization_id);
create index if not exists geofence_alerts_truck_idx on public.geofence_alerts(truck_id);

-- ─── 16. delivery_proofs (safe no-op if already exists from 068) ─────────────
create table if not exists public.delivery_proofs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  load_id         text not null,
  driver_id       text,
  proof_type      text not null default 'signature',
  file_url        text,
  notes           text,
  captured_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists delivery_proofs_load_idx on public.delivery_proofs(load_id);
create index if not exists delivery_proofs_org_idx  on public.delivery_proofs(organization_id);

-- ─── 17. settlement_adjustments ──────────────────────────────────────────────
create table if not exists public.settlement_adjustments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  settlement_id   uuid,
  adjustment_type text not null,
  amount          numeric(12,2),
  reason          text,
  approved_by     uuid,
  approved_at     timestamptz,
  status          text not null default 'pending',
  created_at      timestamptz not null default now()
);
create index if not exists settlement_adjustments_org_idx on public.settlement_adjustments(organization_id);

-- ─── 18. cost_centers ────────────────────────────────────────────────────────
create table if not exists public.cost_centers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  description     text,
  manager         text,
  budget          numeric(12,2),
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists cost_centers_org_idx on public.cost_centers(organization_id);
create unique index if not exists cost_centers_code_org_idx on public.cost_centers(organization_id, code);

-- ─── 19. cost_allocations ────────────────────────────────────────────────────
create table if not exists public.cost_allocations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  cost_center_id  uuid references public.cost_centers(id) on delete cascade,
  entity_type     text not null,
  entity_id       text,
  amount          numeric(12,2) not null,
  allocation_date date not null,
  created_at      timestamptz not null default now()
);
create index if not exists cost_allocations_org_idx    on public.cost_allocations(organization_id);
create index if not exists cost_allocations_center_idx on public.cost_allocations(cost_center_id);

-- ─── 20. email_templates ─────────────────────────────────────────────────────
create table if not exists public.email_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_name   text not null,
  subject         text not null,
  body_text       text,
  body_html       text,
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists email_templates_org_idx on public.email_templates(organization_id);

-- ─── 21. sms_templates ───────────────────────────────────────────────────────
create table if not exists public.sms_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_name   text not null,
  message         text not null,
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists sms_templates_org_idx on public.sms_templates(organization_id);

-- ─── 22. notification_preferences ───────────────────────────────────────────
create table if not exists public.notification_preferences (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid,
  organization_id    uuid references public.organizations(id) on delete cascade,
  email_alerts       boolean default true,
  sms_alerts         boolean default false,
  in_app_alerts      boolean default true,
  notification_types jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists notification_preferences_user_idx on public.notification_preferences(user_id);
create index if not exists notification_preferences_org_idx  on public.notification_preferences(organization_id);

-- ─── 23. webhook_events ──────────────────────────────────────────────────────
create table if not exists public.webhook_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  webhook_id      uuid,
  event_type      text not null,
  payload         jsonb not null,
  status          text not null default 'pending',
  retry_count     integer default 0,
  next_retry      timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists webhook_events_org_idx    on public.webhook_events(organization_id);
create index if not exists webhook_events_status_idx on public.webhook_events(status);

-- ─── 24. background_jobs ─────────────────────────────────────────────────────
create table if not exists public.background_jobs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  job_type        text not null,
  payload         jsonb not null default '{}',
  status          text not null default 'pending' check (status in ('pending','running','completed','failed')),
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists background_jobs_org_idx    on public.background_jobs(organization_id);
create index if not exists background_jobs_status_idx on public.background_jobs(status);

-- ─── 25. api_usage ───────────────────────────────────────────────────────────
create table if not exists public.api_usage (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  api_key_id       uuid,
  endpoint         text not null,
  method           text not null,
  status_code      integer,
  response_time_ms integer,
  created_at       timestamptz not null default now()
);
create index if not exists api_usage_org_idx  on public.api_usage(organization_id);
create index if not exists api_usage_time_idx on public.api_usage(created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.invoice_payment_methods  enable row level security;
alter table public.audit_log                enable row level security;
alter table public.rate_sheets              enable row level security;
alter table public.rate_sheet_lines         enable row level security;
alter table public.load_statuses            enable row level security;
alter table public.shipping_instructions    enable row level security;
alter table public.dispatch_exceptions      enable row level security;
alter table public.vehicle_inspections      enable row level security;
alter table public.vehicle_defects          enable row level security;
alter table public.customer_portal_users    enable row level security;
alter table public.customer_portal_sessions enable row level security;
alter table public.document_templates       enable row level security;
alter table public.report_schedules         enable row level security;
alter table public.report_runs              enable row level security;
alter table public.geofence_alerts          enable row level security;
alter table public.delivery_proofs          enable row level security;
alter table public.settlement_adjustments   enable row level security;
alter table public.cost_centers             enable row level security;
alter table public.cost_allocations         enable row level security;
alter table public.email_templates          enable row level security;
alter table public.sms_templates            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.webhook_events           enable row level security;
alter table public.background_jobs          enable row level security;
alter table public.api_usage                enable row level security;

create policy if not exists "auth_all_invoice_payment_methods"  on public.invoice_payment_methods  for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_audit_log"                on public.audit_log                for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_rate_sheets"              on public.rate_sheets              for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_rate_sheet_lines"         on public.rate_sheet_lines         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_load_statuses"            on public.load_statuses            for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_shipping_instructions"    on public.shipping_instructions    for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dispatch_exceptions"      on public.dispatch_exceptions      for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_vehicle_inspections"      on public.vehicle_inspections      for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_vehicle_defects"          on public.vehicle_defects          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_customer_portal_users"    on public.customer_portal_users    for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_customer_portal_sessions" on public.customer_portal_sessions for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_document_templates"       on public.document_templates       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_report_schedules"         on public.report_schedules         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_report_runs"              on public.report_runs              for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_geofence_alerts"          on public.geofence_alerts          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_delivery_proofs"          on public.delivery_proofs          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_settlement_adjustments"   on public.settlement_adjustments   for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_cost_centers"             on public.cost_centers             for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_cost_allocations"         on public.cost_allocations         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_email_templates"          on public.email_templates          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_sms_templates"            on public.sms_templates            for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_notification_preferences" on public.notification_preferences for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_webhook_events"           on public.webhook_events           for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_background_jobs"          on public.background_jobs          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_api_usage"                on public.api_usage                for all using (auth.role() = 'authenticated');
