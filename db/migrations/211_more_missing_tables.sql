-- Migration 211: Additional tables referenced in code but missing from all prior migrations.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS throughout).

-- ─── 1. fleets ───────────────────────────────────────────────────────────────
create table if not exists public.fleets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  fleet_name      text not null,
  fleet_code      text,
  status          text not null default 'active',
  manager_id      uuid,
  region          text,
  notes           text,
  extra_fields    jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists fleets_org_idx    on public.fleets(organization_id);
create index if not exists fleets_status_idx on public.fleets(status);

-- ─── 2. fleet_managers ───────────────────────────────────────────────────────
create table if not exists public.fleet_managers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  fleet_id        uuid references public.fleets(id) on delete cascade,
  user_id         uuid,
  full_name       text,
  email           text,
  phone           text,
  role            text not null default 'manager',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists fleet_managers_org_idx   on public.fleet_managers(organization_id);
create index if not exists fleet_managers_fleet_idx on public.fleet_managers(fleet_id);

-- ─── 3. fleet_map (real-time fleet position data) ────────────────────────────
create table if not exists public.fleet_map (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  fleet_id        uuid references public.fleets(id) on delete cascade,
  truck_id        text,
  driver_id       text,
  lat             numeric(10,7),
  lng             numeric(10,7),
  speed_mph       numeric(6,2),
  heading         numeric(5,2),
  status          text not null default 'active',
  last_ping_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists fleet_map_org_idx   on public.fleet_map(organization_id);
create index if not exists fleet_map_fleet_idx on public.fleet_map(fleet_id);
create index if not exists fleet_map_truck_idx on public.fleet_map(truck_id);

-- ─── 4. organization_members (org membership / roles) ────────────────────────
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id         uuid not null,
  email           text,
  role            text not null default 'member',
  status          text not null default 'active',
  invited_by      uuid,
  invited_at      timestamptz,
  joined_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists organization_members_user_org_idx on public.organization_members(organization_id, user_id);
create index if not exists organization_members_org_idx  on public.organization_members(organization_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);

-- ─── 5. hr_docs (HR document storage references) ─────────────────────────────
create table if not exists public.hr_docs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text,
  driver_uuid     uuid,
  doc_type        text not null,
  file_url        text not null,
  file_name       text,
  file_size       bigint,
  status          text not null default 'active',
  expires_at      date,
  uploaded_by     uuid,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists hr_docs_org_idx    on public.hr_docs(organization_id);
create index if not exists hr_docs_driver_idx on public.hr_docs(driver_id);

-- ─── 6. hr_records (general HR records per employee/driver) ──────────────────
create table if not exists public.hr_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  employee_id     text,
  employee_uuid   uuid,
  record_type     text not null,
  title           text,
  description     text,
  effective_date  date,
  status          text not null default 'active',
  data            jsonb not null default '{}',
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists hr_records_org_idx      on public.hr_records(organization_id);
create index if not exists hr_records_employee_idx on public.hr_records(employee_id);

-- ─── 7. dispatches (company-level dispatch records) ──────────────────────────
create table if not exists public.dispatches (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  company_id      text,
  driver_id       text,
  truck_id        text,
  load_id         text,
  status          text not null default 'pending',
  scheduled_at    timestamptz,
  dispatched_at   timestamptz,
  completed_at    timestamptz,
  origin          text,
  destination     text,
  notes           text,
  extra_fields    jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists dispatches_org_idx     on public.dispatches(organization_id);
create index if not exists dispatches_company_idx on public.dispatches(company_id);
create index if not exists dispatches_driver_idx  on public.dispatches(driver_id);
create index if not exists dispatches_status_idx  on public.dispatches(status);

-- ─── 8. dot_compliance (DOT compliance tracking per driver/vehicle) ───────────
create table if not exists public.dot_compliance (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text not null default 'driver',
  entity_id       text not null,
  compliance_type text not null,
  status          text not null default 'compliant',
  due_date        date,
  last_checked_at timestamptz,
  notes           text,
  data            jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists dot_compliance_org_idx    on public.dot_compliance(organization_id);
create index if not exists dot_compliance_entity_idx on public.dot_compliance(entity_type, entity_id);

-- ─── 9. compliance_dashboard_summary (rollup used by HR compliance page) ─────
create table if not exists public.compliance_dashboard_summary (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  period_start    date,
  period_end      date,
  total_drivers   integer not null default 0,
  compliant_count integer not null default 0,
  non_compliant   integer not null default 0,
  pending_count   integer not null default 0,
  expiring_soon   integer not null default 0,
  score           numeric(5,2),
  categories      jsonb not null default '{}',
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists compliance_dashboard_summary_org_idx on public.compliance_dashboard_summary(organization_id);

-- ─── 10. audit_readiness_report (HR compliance audit readiness) ──────────────
create table if not exists public.audit_readiness_report (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  report_type     text not null default 'dot',
  status          text not null default 'draft',
  readiness_score numeric(5,2),
  findings        jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  generated_by    uuid,
  generated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists audit_readiness_report_org_idx on public.audit_readiness_report(organization_id);

-- ─── 11. contract_audit (audit trail for contract changes) ───────────────────
create table if not exists public.contract_audit (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  contract_id     text not null,
  action          text not null,
  changed_by      uuid,
  changed_by_name text,
  field_name      text,
  old_value       text,
  new_value       text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists contract_audit_org_idx      on public.contract_audit(organization_id);
create index if not exists contract_audit_contract_idx on public.contract_audit(contract_id);

-- ─── 12. customer_support_messages (customer portal chat) ────────────────────
create table if not exists public.customer_support_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  customer_id     text,
  ticket_id       text,
  sender_type     text not null default 'customer' check (sender_type in ('customer','support','system')),
  sender_id       uuid,
  sender_name     text,
  message         text not null,
  attachments     jsonb not null default '[]',
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists customer_support_messages_org_idx      on public.customer_support_messages(organization_id);
create index if not exists customer_support_messages_customer_idx on public.customer_support_messages(customer_id);
create index if not exists customer_support_messages_ticket_idx   on public.customer_support_messages(ticket_id);

-- ─── 13. billing_payments (payment records for partner/billing module) ────────
create table if not exists public.billing_payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  partner_id      text,
  invoice_id      text,
  amount          numeric(12,2) not null,
  currency        text not null default 'USD',
  payment_method  text,
  status          text not null default 'pending',
  paid_at         timestamptz,
  reference       text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists billing_payments_org_idx     on public.billing_payments(organization_id);
create index if not exists billing_payments_partner_idx on public.billing_payments(partner_id);
create index if not exists billing_payments_status_idx  on public.billing_payments(status);

-- ─── 14. commission_events (partner commission tracking) ─────────────────────
create table if not exists public.commission_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  partner_id      text,
  event_type      text not null,
  reference_id    text,
  amount          numeric(12,2) not null,
  rate_pct        numeric(5,4),
  status          text not null default 'pending',
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists commission_events_org_idx     on public.commission_events(organization_id);
create index if not exists commission_events_partner_idx on public.commission_events(partner_id);

-- ─── 15. paystubs (generated driver paystubs) ────────────────────────────────
create table if not exists public.paystubs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  pay_period_start date not null,
  pay_period_end   date not null,
  gross_pay       numeric(12,2) not null default 0,
  deductions      numeric(12,2) not null default 0,
  net_pay         numeric(12,2) not null default 0,
  status          text not null default 'draft',
  pdf_url         text,
  sent_at         timestamptz,
  line_items      jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists paystubs_org_idx    on public.paystubs(organization_id);
create index if not exists paystubs_driver_idx on public.paystubs(driver_id);
create index if not exists paystubs_period_idx on public.paystubs(pay_period_start, pay_period_end);

-- ─── 16. scale_ticket_images (image uploads for dump truck scale tickets) ────
create table if not exists public.scale_ticket_images (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  ticket_id       text,
  driver_id       text,
  truck_number    text,
  file_path       text not null,
  file_url        text,
  file_name       text,
  file_size       bigint,
  ocr_status      text not null default 'pending',
  ocr_data        jsonb not null default '{}',
  uploaded_by     uuid,
  uploaded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists scale_ticket_images_org_idx    on public.scale_ticket_images(organization_id);
create index if not exists scale_ticket_images_ticket_idx on public.scale_ticket_images(ticket_id);
create index if not exists scale_ticket_images_driver_idx on public.scale_ticket_images(driver_id);

-- Also create the storage bucket for scale_ticket_images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scale-ticket-images',
  'scale-ticket-images',
  false,
  52428800,
  array['image/jpeg','image/png','image/jpg','image/webp','image/heic','application/pdf']
) on conflict (id) do nothing;

create policy if not exists "scale_ticket_images_auth" on storage.objects
  for all using (bucket_id = 'scale-ticket-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'scale-ticket-images' and auth.role() = 'authenticated');

-- ─── 17. onboarding_workflow_steps (step definitions for onboarding workflows) ─
create table if not exists public.onboarding_workflow_steps (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workflow_name   text not null,
  step_name       text not null,
  step_order      integer not null default 1,
  required        boolean not null default true,
  description     text,
  action_type     text not null default 'manual',
  config          jsonb not null default '{}',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists onboarding_workflow_steps_org_idx on public.onboarding_workflow_steps(organization_id);
create index if not exists onboarding_workflow_steps_name_idx on public.onboarding_workflow_steps(workflow_name);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.fleets                       enable row level security;
alter table public.fleet_managers               enable row level security;
alter table public.fleet_map                    enable row level security;
alter table public.organization_members         enable row level security;
alter table public.hr_docs                      enable row level security;
alter table public.hr_records                   enable row level security;
alter table public.dispatches                   enable row level security;
alter table public.dot_compliance               enable row level security;
alter table public.compliance_dashboard_summary enable row level security;
alter table public.audit_readiness_report       enable row level security;
alter table public.contract_audit               enable row level security;
alter table public.customer_support_messages    enable row level security;
alter table public.billing_payments             enable row level security;
alter table public.commission_events            enable row level security;
alter table public.paystubs                     enable row level security;
alter table public.scale_ticket_images          enable row level security;
alter table public.onboarding_workflow_steps    enable row level security;

create policy if not exists "auth_all_fleets"                       on public.fleets                       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fleet_managers"               on public.fleet_managers               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fleet_map"                    on public.fleet_map                    for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_organization_members"         on public.organization_members         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_hr_docs"                      on public.hr_docs                      for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_hr_records"                   on public.hr_records                   for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dispatches"                   on public.dispatches                   for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dot_compliance"               on public.dot_compliance               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_compliance_dashboard_summary" on public.compliance_dashboard_summary for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_audit_readiness_report"       on public.audit_readiness_report       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_contract_audit"               on public.contract_audit               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_customer_support_messages"    on public.customer_support_messages    for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_billing_payments"             on public.billing_payments             for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_commission_events"            on public.commission_events            for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_paystubs"                     on public.paystubs                     for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_scale_ticket_images"          on public.scale_ticket_images          for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_onboarding_workflow_steps"    on public.onboarding_workflow_steps    for all using (auth.role() = 'authenticated');
