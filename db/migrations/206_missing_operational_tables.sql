-- Migration 206: Create 15 tables referenced in application code but missing from schema.
-- Run in Supabase SQL Editor.

-- ─── 1. ai_validation_rules ─────────────────────────────────────────────────
create table if not exists public.ai_validation_rules (
  rule_id        serial primary key,
  rule_type      text not null check (rule_type in ('distance','weight','time','location','photo','signature')),
  rule_name      text not null,
  rule_logic     jsonb,
  threshold      numeric,
  severity       text not null default 'warning' check (severity in ('warning','error','block')),
  auto_correct   boolean not null default false,
  project_specific boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ─── 2. ticket_validation_log ───────────────────────────────────────────────
create table if not exists public.ticket_validation_log (
  id                   uuid primary key default gen_random_uuid(),
  ticket_id            text not null,
  validation_type      text,
  validation_status    text,
  rule_id              integer references public.ai_validation_rules(rule_id),
  actual_value         numeric,
  expected_value       numeric,
  variance_percent     numeric,
  confidence_score     numeric,
  auto_corrected_value numeric,
  correction_note      text,
  created_at           timestamptz not null default now()
);
create index if not exists ticket_validation_log_ticket_id_idx on public.ticket_validation_log(ticket_id);

-- ─── 3. compliance_notifications ────────────────────────────────────────────
create table if not exists public.compliance_notifications (
  id               uuid primary key default gen_random_uuid(),
  alert_type       text not null,
  truck_number     text,
  dvir_id          text,
  message          text not null,
  recipient_email  text,
  created_at       timestamptz not null default now()
);

-- ─── 4. compliance_results ──────────────────────────────────────────────────
create table if not exists public.compliance_results (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  scan_id         text,
  compliant       boolean not null default false,
  score           integer not null default 0,
  issues          jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  evaluated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists compliance_results_org_idx on public.compliance_results(organization_id);

-- ─── 5. driver_assignments ──────────────────────────────────────────────────
create table if not exists public.driver_assignments (
  id          uuid primary key default gen_random_uuid(),
  driver_id   text not null,
  truck_id    text not null,
  status      text not null default 'Scheduled',
  created_at  timestamptz not null default now()
);
create index if not exists driver_assignments_driver_idx on public.driver_assignments(driver_id);

-- ─── 6. driver_onboarding ───────────────────────────────────────────────────
create table if not exists public.driver_onboarding (
  id               uuid primary key default gen_random_uuid(),
  driver_email     text not null unique,
  current_step     integer not null default 1,
  status           text not null default 'in_progress',
  personal_info    jsonb,
  employment_info  jsonb,
  started_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── 7. driver_onboarding_documents ─────────────────────────────────────────
create table if not exists public.driver_onboarding_documents (
  id               uuid primary key default gen_random_uuid(),
  driver_email     text not null,
  document_type    text not null,
  file_url         text not null,
  file_name        text,
  expiration_date  timestamptz,
  status           text not null default 'uploaded',
  uploaded_at      timestamptz not null default now(),
  approved_by      text,
  approved_at      timestamptz,
  rejection_reason text,
  updated_at       timestamptz not null default now()
);
create index if not exists driver_onboarding_docs_email_idx on public.driver_onboarding_documents(driver_email);

-- ─── 8. driver_pay_rates ────────────────────────────────────────────────────
create table if not exists public.driver_pay_rates (
  id              uuid primary key default gen_random_uuid(),
  driver_id       text not null,
  rate_name       text,
  rate_type       text not null check (rate_type in ('PER_TON','PER_LOAD','PER_MILE','PER_HOUR')),
  rate_value      numeric not null,
  material_type   text,
  customer_id     text,
  job_id          text,
  equipment_type  text,
  is_default      boolean default false,
  effective_date  date not null default current_date,
  created_at      timestamptz not null default now()
);
create index if not exists driver_pay_rates_driver_idx on public.driver_pay_rates(driver_id);

-- ─── 9. driver_yard_events ──────────────────────────────────────────────────
create table if not exists public.driver_yard_events (
  id              uuid primary key default gen_random_uuid(),
  driver_id       text not null,
  driver_uuid     uuid,
  organization_id uuid references public.organizations(id) on delete cascade,
  event_type      text not null,
  timestamp       timestamptz not null default now(),
  location        text check (length(location) <= 500),
  notes           text check (length(notes) <= 2000),
  truck_id        text,
  load_id         text,
  created_at      timestamptz not null default now()
);
create index if not exists driver_yard_events_driver_idx on public.driver_yard_events(driver_id);
create index if not exists driver_yard_events_org_idx   on public.driver_yard_events(organization_id);

-- ─── 10. load_requests ──────────────────────────────────────────────────────
create table if not exists public.load_requests (
  id                   uuid primary key default gen_random_uuid(),
  customer_id          text not null,
  status               text not null default 'pending',
  origin_address       text,
  origin_city          text,
  origin_state         text,
  origin_zip_code      text,
  destination_address  text,
  destination_city     text,
  destination_state    text,
  destination_zip_code text,
  pickup_date          timestamptz,
  delivery_date        timestamptz,
  commodity            text,
  weight               numeric,
  equipment_type       text,
  special_requirements text,
  estimated_rate       numeric,
  created_at           timestamptz not null default now()
);
create index if not exists load_requests_customer_idx on public.load_requests(customer_id);
create index if not exists load_requests_status_idx   on public.load_requests(status);

-- ─── 11. recruiters ─────────────────────────────────────────────────────────
create table if not exists public.recruiters (
  id           text primary key,
  name         text not null,
  avatar_url   text,
  company_name text,
  email        text not null,
  phone        text,
  bio          text,
  created_at   timestamptz not null default now()
);

-- ─── 12. ronyx_driver_events ────────────────────────────────────────────────
create table if not exists public.ronyx_driver_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,
  driver_id   text not null,
  load_id     text,
  timestamp   timestamptz not null default now(),
  status_code text,
  note        text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ronyx_driver_events_driver_idx on public.ronyx_driver_events(driver_id);

-- ─── 13. ronyx_driver_truck_pool ────────────────────────────────────────────
create table if not exists public.ronyx_driver_truck_pool (
  id                 uuid primary key default gen_random_uuid(),
  truck_number       text not null,
  driver_name        text,
  company_name       text,
  owner_operator_id  text,
  created_at         timestamptz not null default now()
);

-- ─── 14. ticket_templates ───────────────────────────────────────────────────
create table if not exists public.ticket_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  partner_name    text,
  base_image_url  text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── 15. template_fields ────────────────────────────────────────────────────
create table if not exists public.template_fields (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.ticket_templates(id) on delete cascade,
  field_name   text not null,
  field_type   text not null default 'text',
  field_config jsonb not null default '{}',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists template_fields_template_idx on public.template_fields(template_id);

-- ─── RLS: enable on all new tables (service-role bypasses, staff access via org) ──
alter table public.ai_validation_rules         enable row level security;
alter table public.ticket_validation_log       enable row level security;
alter table public.compliance_notifications    enable row level security;
alter table public.compliance_results          enable row level security;
alter table public.driver_assignments          enable row level security;
alter table public.driver_onboarding           enable row level security;
alter table public.driver_onboarding_documents enable row level security;
alter table public.driver_pay_rates            enable row level security;
alter table public.driver_yard_events          enable row level security;
alter table public.load_requests               enable row level security;
alter table public.recruiters                  enable row level security;
alter table public.ronyx_driver_events         enable row level security;
alter table public.ronyx_driver_truck_pool     enable row level security;
alter table public.ticket_templates            enable row level security;
alter table public.template_fields             enable row level security;

-- Authenticated read/write for all (server-side routes use service-role which bypasses RLS)
create policy if not exists "auth_all_ai_validation_rules"
  on public.ai_validation_rules for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ticket_validation_log"
  on public.ticket_validation_log for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_compliance_notifications"
  on public.compliance_notifications for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_compliance_results"
  on public.compliance_results for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_assignments"
  on public.driver_assignments for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_onboarding"
  on public.driver_onboarding for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_onboarding_documents"
  on public.driver_onboarding_documents for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_pay_rates"
  on public.driver_pay_rates for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_yard_events"
  on public.driver_yard_events for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_load_requests"
  on public.load_requests for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_recruiters"
  on public.recruiters for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ronyx_driver_events"
  on public.ronyx_driver_events for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ronyx_driver_truck_pool"
  on public.ronyx_driver_truck_pool for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ticket_templates"
  on public.ticket_templates for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_template_fields"
  on public.template_fields for all using (auth.role() = 'authenticated');
