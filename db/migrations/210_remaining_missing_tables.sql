-- Migration 210: Create remaining tables referenced in code but missing from all prior migrations.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS throughout).

-- ─── 1. ronyx_tickets (core dump-truck tickets for payroll engine) ───────────
create table if not exists public.ronyx_tickets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_name     text,
  truck_number    text,
  ticket_number   text,
  ticket_date     date not null,
  job_id          text,
  job_name        text,
  pit_name        text,
  material        text,
  load_type       text,
  tons            numeric(12,3),
  rate_type       text,
  rate_amount     numeric(12,4),
  gross_amount    numeric(12,2),
  net_amount      numeric(12,2),
  status          text not null default 'pending',
  payment_status  text not null default 'unpaid',
  voided_at       timestamptz,
  voided_by       text,
  void_reason     text,
  ocr_data        jsonb not null default '{}',
  extra_fields    jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ronyx_tickets_driver_idx  on public.ronyx_tickets(driver_id);
create index if not exists ronyx_tickets_date_idx    on public.ronyx_tickets(ticket_date);
create index if not exists ronyx_tickets_status_idx  on public.ronyx_tickets(status);
create index if not exists ronyx_tickets_org_idx     on public.ronyx_tickets(organization_id);
create index if not exists ronyx_tickets_job_idx     on public.ronyx_tickets(job_id);

-- ─── 2. dvir_defects (defects found in Driver Vehicle Inspection Reports) ───
create table if not exists public.dvir_defects (
  id              uuid primary key default gen_random_uuid(),
  dvir_id         uuid references public.dvir(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  defect_type     text not null,
  location        text,
  description     text,
  severity        text not null default 'minor',
  corrected       boolean not null default false,
  corrected_at    timestamptz,
  corrected_by    text,
  created_at      timestamptz not null default now()
);
create index if not exists dvir_defects_dvir_idx on public.dvir_defects(dvir_id);
create index if not exists dvir_defects_org_idx  on public.dvir_defects(organization_id);

-- ─── 3. dvir_inspections (inspection records linked to DVIR) ────────────────
create table if not exists public.dvir_inspections (
  id              uuid primary key default gen_random_uuid(),
  dvir_id         uuid references public.dvir(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  inspector_id    uuid,
  inspector_name  text,
  inspection_type text not null default 'pre-trip',
  result          text not null default 'satisfactory',
  notes           text,
  signature_url   text,
  inspected_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists dvir_inspections_dvir_idx on public.dvir_inspections(dvir_id);
create index if not exists dvir_inspections_org_idx  on public.dvir_inspections(organization_id);

-- ─── 4. agent_leads (internal sales/agent lead pipeline) ─────────────────────
create table if not exists public.agent_leads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  agent_id        uuid,
  company_name    text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  status          text not null default 'new',
  source          text,
  notes           text,
  estimated_value numeric(12,2),
  assigned_to     uuid,
  converted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists agent_leads_org_idx    on public.agent_leads(organization_id);
create index if not exists agent_leads_status_idx on public.agent_leads(status);

-- ─── 5. public_leads (inbound leads from public-facing forms) ───────────────
create table if not exists public.public_leads (
  id              uuid primary key default gen_random_uuid(),
  company_name    text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  message         text,
  source          text,
  status          text not null default 'new',
  assigned_to     uuid,
  notes           text,
  converted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists public_leads_status_idx on public.public_leads(status);
create index if not exists public_leads_email_idx  on public.public_leads(contact_email);

-- ─── 6. avatars (user/driver avatar storage references) ─────────────────────
create table if not exists public.avatars (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
  owner_type      text not null default 'user',
  file_url        text not null,
  file_name       text,
  file_size       bigint,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create unique index if not exists avatars_owner_active_idx on public.avatars(owner_id) where is_active = true;

-- ─── 7. company_assets (company-owned physical assets) ──────────────────────
create table if not exists public.company_assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  asset_type      text not null,
  asset_name      text not null,
  asset_number    text,
  status          text not null default 'active',
  assigned_to     text,
  purchase_date   date,
  purchase_price  numeric(12,2),
  current_value   numeric(12,2),
  location        text,
  notes           text,
  extra_fields    jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists company_assets_org_idx    on public.company_assets(organization_id);
create index if not exists company_assets_type_idx   on public.company_assets(asset_type);
create index if not exists company_assets_status_idx on public.company_assets(status);

-- ─── 8. company_assets_objects (storage objects linked to company assets) ───
create table if not exists public.company_assets_objects (
  id              uuid primary key default gen_random_uuid(),
  asset_id        uuid not null references public.company_assets(id) on delete cascade,
  object_type     text not null default 'document',
  file_url        text not null,
  file_name       text,
  file_size       bigint,
  uploaded_by     uuid,
  created_at      timestamptz not null default now()
);
create index if not exists company_assets_objects_asset_idx on public.company_assets_objects(asset_id);

-- ─── 9. customer_messages (messages sent to/from customers) ─────────────────
create table if not exists public.customer_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  customer_id     text,
  load_id         text,
  direction       text not null default 'outbound' check (direction in ('inbound','outbound')),
  channel         text not null default 'email',
  subject         text,
  body            text not null,
  status          text not null default 'sent',
  sent_by         uuid,
  sent_at         timestamptz not null default now(),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists customer_messages_org_idx      on public.customer_messages(organization_id);
create index if not exists customer_messages_customer_idx on public.customer_messages(customer_id);
create index if not exists customer_messages_load_idx     on public.customer_messages(load_id);

-- ─── 10. trip_status_history (audit trail of trip status changes) ────────────
create table if not exists public.trip_status_history (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  trip_id         text not null,
  load_id         text,
  driver_id       text,
  old_status      text,
  new_status      text not null,
  changed_by      uuid,
  changed_at      timestamptz not null default now(),
  notes           text,
  location        text,
  created_at      timestamptz not null default now()
);
create index if not exists trip_status_history_trip_idx  on public.trip_status_history(trip_id);
create index if not exists trip_status_history_org_idx   on public.trip_status_history(organization_id);
create index if not exists trip_status_history_time_idx  on public.trip_status_history(changed_at desc);

-- ─── 11. fastscan_uploads (alternate fast-scan upload table for fastscan routes) ──
create table if not exists public.fastscan_uploads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text,
  file_name       text not null,
  file_url        text,
  file_type       text,
  file_size       bigint,
  scan_type       text not null default 'ticket',
  status          text not null default 'pending',
  ocr_data        jsonb not null default '{}',
  extracted_text  text,
  confidence_score numeric(5,4) default 0.8,
  uploaded_by     uuid,
  uploaded_at     timestamptz not null default now(),
  processed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists fastscan_uploads_org_idx    on public.fastscan_uploads(organization_id);
create index if not exists fastscan_uploads_driver_idx on public.fastscan_uploads(driver_id);
create index if not exists fastscan_uploads_status_idx on public.fastscan_uploads(status);

-- ─── 12. fastscan_support_messages (support chat for fast-scan issues) ───────
create table if not exists public.fastscan_support_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  scan_id         uuid,
  sender_type     text not null default 'user' check (sender_type in ('user','support')),
  sender_id       uuid,
  message         text not null,
  attachments     jsonb not null default '[]',
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists fastscan_support_messages_scan_idx on public.fastscan_support_messages(scan_id);
create index if not exists fastscan_support_messages_org_idx  on public.fastscan_support_messages(organization_id);

-- ─── 13. compliance_documents (documents attached to compliance records) ─────
create table if not exists public.compliance_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text not null,
  entity_id       text not null,
  doc_type        text not null,
  file_url        text not null,
  file_name       text,
  expires_at      date,
  status          text not null default 'active',
  uploaded_by     uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists compliance_documents_org_idx    on public.compliance_documents(organization_id);
create index if not exists compliance_documents_entity_idx on public.compliance_documents(entity_type, entity_id);

-- ─── 14. compliance_violations (compliance violation records) ───────────────
create table if not exists public.compliance_violations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text not null,
  entity_id       text not null,
  violation_type  text not null,
  severity        text not null default 'minor',
  description     text,
  issued_date     date,
  resolved_at     timestamptz,
  resolved_by     uuid,
  fine_amount     numeric(12,2),
  status          text not null default 'open',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists compliance_violations_org_idx    on public.compliance_violations(organization_id);
create index if not exists compliance_violations_entity_idx on public.compliance_violations(entity_type, entity_id);
create index if not exists compliance_violations_status_idx on public.compliance_violations(status);

-- ─── 15. job_posts (hiring job posts — used by hiring/job routes) ────────────
create table if not exists public.job_posts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  recruiter_id    text,
  title           text not null,
  location        text,
  job_type        text,
  description     text,
  requirements    text,
  pay_range       text,
  status          text not null default 'active',
  expires_at      date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists job_posts_org_idx    on public.job_posts(organization_id);
create index if not exists job_posts_status_idx on public.job_posts(status);

-- ─── 16. load_documents (documents attached to loads) ───────────────────────
create table if not exists public.load_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  load_id         text not null,
  doc_type        text not null default 'bol',
  file_url        text not null,
  file_name       text,
  file_size       bigint,
  uploaded_by     uuid,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists load_documents_load_idx on public.load_documents(load_id);
create index if not exists load_documents_org_idx  on public.load_documents(organization_id);

-- ─── 17. partner_contracts (contracts with business partners) ───────────────
create table if not exists public.partner_contracts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  partner_id      text,
  partner_name    text,
  contract_type   text not null default 'service',
  start_date      date,
  end_date        date,
  value           numeric(12,2),
  status          text not null default 'active',
  file_url        text,
  notes           text,
  signed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists partner_contracts_org_idx    on public.partner_contracts(organization_id);
create index if not exists partner_contracts_status_idx on public.partner_contracts(status);

-- ─── 18. performance_goals / driver_goals / driver_performance_goals ─────────
create table if not exists public.performance_goals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text not null default 'driver',
  entity_id       text not null,
  goal_type       text not null,
  target_value    numeric(12,2),
  current_value   numeric(12,2),
  unit            text,
  period_start    date,
  period_end      date,
  status          text not null default 'active',
  achieved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists performance_goals_org_idx    on public.performance_goals(organization_id);
create index if not exists performance_goals_entity_idx on public.performance_goals(entity_type, entity_id);

create table if not exists public.driver_goals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  goal_type       text not null,
  target_value    numeric(12,2),
  current_value   numeric(12,2),
  unit            text,
  period_start    date,
  period_end      date,
  status          text not null default 'active',
  achieved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_goals_org_idx    on public.driver_goals(organization_id);
create index if not exists driver_goals_driver_idx on public.driver_goals(driver_id);

create table if not exists public.driver_performance_goals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  metric          text not null,
  target          numeric(12,2),
  actual          numeric(12,2),
  period          text,
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_perf_goals_org_idx    on public.driver_performance_goals(organization_id);
create index if not exists driver_perf_goals_driver_idx on public.driver_performance_goals(driver_id);

-- ─── 19. regulatory_tracking ────────────────────────────────────────────────
create table if not exists public.regulatory_tracking (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text not null,
  entity_id       text not null,
  regulation_type text not null,
  regulation_name text,
  status          text not null default 'compliant',
  due_date        date,
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists regulatory_tracking_org_idx    on public.regulatory_tracking(organization_id);
create index if not exists regulatory_tracking_entity_idx on public.regulatory_tracking(entity_type, entity_id);

-- ─── 20. trainings / training_records / driver_trainings / driver_safety_training ──
create table if not exists public.trainings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  training_type   text not null default 'general',
  duration_hours  numeric(5,2),
  required        boolean not null default false,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists trainings_org_idx on public.trainings(organization_id);

create table if not exists public.training_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  training_id     uuid references public.trainings(id) on delete set null,
  driver_id       text not null,
  driver_uuid     uuid,
  status          text not null default 'pending',
  completed_at    timestamptz,
  score           numeric(5,2),
  certificate_url text,
  expires_at      date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists training_records_org_idx    on public.training_records(organization_id);
create index if not exists training_records_driver_idx on public.training_records(driver_id);

create table if not exists public.driver_trainings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  training_name   text not null,
  training_type   text not null default 'general',
  status          text not null default 'pending',
  completed_at    timestamptz,
  expires_at      date,
  certificate_url text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_trainings_org_idx    on public.driver_trainings(organization_id);
create index if not exists driver_trainings_driver_idx on public.driver_trainings(driver_id);

create table if not exists public.driver_safety_training (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  training_type   text not null,
  completed_at    timestamptz,
  expires_at      date,
  passed          boolean not null default false,
  score           numeric(5,2),
  instructor      text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists driver_safety_training_org_idx    on public.driver_safety_training(organization_id);
create index if not exists driver_safety_training_driver_idx on public.driver_safety_training(driver_id);

-- ─── 21. driver_safety_alerts ───────────────────────────────────────────────
create table if not exists public.driver_safety_alerts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  alert_type      text not null,
  severity        text not null default 'warning',
  message         text not null,
  status          text not null default 'open',
  resolved_at     timestamptz,
  resolved_by     uuid,
  created_at      timestamptz not null default now()
);
create index if not exists driver_safety_alerts_org_idx    on public.driver_safety_alerts(organization_id);
create index if not exists driver_safety_alerts_driver_idx on public.driver_safety_alerts(driver_id);
create index if not exists driver_safety_alerts_status_idx on public.driver_safety_alerts(status);

-- ─── 22. onboarding_step_completion (tracks individual onboarding step status) ──
create table if not exists public.onboarding_step_completion (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_email    text not null,
  step_name       text not null,
  step_order      integer not null default 1,
  completed       boolean not null default false,
  completed_at    timestamptz,
  data            jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists onboarding_step_completion_email_idx on public.onboarding_step_completion(driver_email);
create index if not exists onboarding_step_completion_org_idx   on public.onboarding_step_completion(organization_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.ronyx_tickets              enable row level security;
alter table public.dvir_defects               enable row level security;
alter table public.dvir_inspections           enable row level security;
alter table public.agent_leads                enable row level security;
alter table public.public_leads               enable row level security;
alter table public.avatars                    enable row level security;
alter table public.company_assets             enable row level security;
alter table public.company_assets_objects     enable row level security;
alter table public.customer_messages          enable row level security;
alter table public.trip_status_history        enable row level security;
alter table public.fastscan_uploads           enable row level security;
alter table public.fastscan_support_messages  enable row level security;
alter table public.compliance_documents       enable row level security;
alter table public.compliance_violations      enable row level security;
alter table public.job_posts                  enable row level security;
alter table public.load_documents             enable row level security;
alter table public.partner_contracts          enable row level security;
alter table public.performance_goals          enable row level security;
alter table public.driver_goals               enable row level security;
alter table public.driver_performance_goals   enable row level security;
alter table public.regulatory_tracking        enable row level security;
alter table public.trainings                  enable row level security;
alter table public.training_records           enable row level security;
alter table public.driver_trainings           enable row level security;
alter table public.driver_safety_training     enable row level security;
alter table public.driver_safety_alerts       enable row level security;
alter table public.onboarding_step_completion enable row level security;

create policy if not exists "auth_all_ronyx_tickets"              on public.ronyx_tickets              for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dvir_defects"               on public.dvir_defects               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dvir_inspections"           on public.dvir_inspections           for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_agent_leads"                on public.agent_leads                for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_public_leads"               on public.public_leads               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_avatars"                    on public.avatars                    for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_company_assets"             on public.company_assets             for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_company_assets_objects"     on public.company_assets_objects     for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_customer_messages"          on public.customer_messages          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_trip_status_history"        on public.trip_status_history        for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fastscan_uploads"           on public.fastscan_uploads           for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fastscan_support_messages"  on public.fastscan_support_messages  for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_compliance_documents"       on public.compliance_documents       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_compliance_violations"      on public.compliance_violations      for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_job_posts"                  on public.job_posts                  for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_load_documents"             on public.load_documents             for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_partner_contracts"          on public.partner_contracts          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_performance_goals"          on public.performance_goals          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_goals"               on public.driver_goals               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_performance_goals"   on public.driver_performance_goals   for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_regulatory_tracking"        on public.regulatory_tracking        for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_trainings"                  on public.trainings                  for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_training_records"           on public.training_records           for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_trainings"           on public.driver_trainings           for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_safety_training"     on public.driver_safety_training     for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_safety_alerts"       on public.driver_safety_alerts       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_onboarding_step_completion" on public.onboarding_step_completion for all using (auth.role() = 'authenticated');
