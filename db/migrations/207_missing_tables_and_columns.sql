-- Migration 207: Fix missing columns and create tables referenced in app code.
-- Safe to re-run (all statements use IF NOT EXISTS / IF column doesn't exist).

-- ─── Fix: load_requests missing updated_at (used in tracking route) ─────────
alter table public.load_requests
  add column if not exists updated_at timestamptz not null default now();

-- ─── 1. branding ────────────────────────────────────────────────────────────
create table if not exists public.branding (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  domain            text unique,
  company_name      text,
  logo_url          text,
  favicon_url       text,
  primary_color     text,
  accent_color      text,
  background_color  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists branding_org_idx on public.branding(organization_id);
create index if not exists branding_domain_idx on public.branding(domain);

-- ─── 2. intel_verify_queue (Dispatch Guard™ document extraction queue) ───────
create table if not exists public.intel_verify_queue (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid references public.organizations(id) on delete cascade,
  oo_id                  uuid,
  upload_id              uuid,
  file_name              text not null,
  file_type              text,
  doc_type               text,
  extracted_fields       jsonb not null default '[]',
  status                 text not null default 'pending',
  high_confidence_count  integer not null default 0,
  low_confidence_count   integer not null default 0,
  approved_by            uuid,
  approved_at            timestamptz,
  approved_fields        jsonb,
  rejected_fields        jsonb,
  extraction_error       text,
  created_by             uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists intel_verify_queue_org_idx on public.intel_verify_queue(org_id);
create index if not exists intel_verify_queue_oo_idx  on public.intel_verify_queue(oo_id);
create index if not exists intel_verify_queue_status_idx on public.intel_verify_queue(status);

-- ─── 3. intel_verify_audit (Dispatch Guard™ approval audit trail) ────────────
create table if not exists public.intel_verify_audit (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid references public.organizations(id) on delete cascade,
  extraction_id         uuid references public.intel_verify_queue(id),
  oo_id                 uuid,
  file_name             text,
  doc_type              text,
  approved_field_count  integer not null default 0,
  rejected_field_count  integer not null default 0,
  approved_by_user      uuid,
  approved_by_name      text,
  oo_fields_updated     text,
  ccb_tasks_created     text,
  result_summary        text,
  created_at            timestamptz not null default now()
);
create index if not exists intel_verify_audit_org_idx on public.intel_verify_audit(org_id);
create index if not exists intel_verify_audit_oo_idx  on public.intel_verify_audit(oo_id);

-- ─── 4. dvir (Driver Vehicle Inspection Reports) ────────────────────────────
create table if not exists public.dvir (
  id          uuid primary key default gen_random_uuid(),
  driver_uuid uuid,
  truck       text,
  type        text not null default 'pre-trip',
  defects     text,
  notes       text,
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists dvir_driver_idx on public.dvir(driver_uuid);
create index if not exists dvir_org_idx    on public.dvir(organization_id);

-- ─── 5. driver_layouts (per-driver UI layout customization) ─────────────────
create table if not exists public.driver_layouts (
  id          uuid primary key default gen_random_uuid(),
  driver_uuid uuid not null,
  layout_json jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);
create unique index if not exists driver_layouts_driver_unique on public.driver_layouts(driver_uuid);

-- ─── 6. dispatch_messages (in-app dispatcher ↔ driver messaging) ────────────
create table if not exists public.dispatch_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  load_id         text,
  sender          text not null check (sender in ('dispatcher','driver')),
  sender_id       uuid,
  text            text not null,
  read            boolean not null default false,
  timestamp       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists dispatch_messages_org_idx  on public.dispatch_messages(organization_id);
create index if not exists dispatch_messages_load_idx on public.dispatch_messages(load_id);

-- ─── 7. plants (pit/plant/facility master data) ─────────────────────────────
create table if not exists public.plants (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name            text not null,
  address         text,
  city            text,
  state           text,
  zip             text,
  lat             numeric,
  lng             numeric,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists plants_org_idx on public.plants(organization_id);

-- ─── 8. scans (generic scan/receipt tracking) ───────────────────────────────
create table if not exists public.scans (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  file_name       text,
  file_path       text,
  file_url        text,
  file_size       bigint,
  status          text not null default 'pending',
  ocr_data        jsonb,
  ocr_result      jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists scans_org_idx    on public.scans(organization_id);
create index if not exists scans_status_idx on public.scans(status);

-- ─── 9. job_postings ────────────────────────────────────────────────────────
create table if not exists public.job_postings (
  id            uuid primary key default gen_random_uuid(),
  recruiter_id  text,
  title         text not null,
  location      text,
  type          text,
  description   text,
  status        text not null default 'active',
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists job_postings_org_idx on public.job_postings(organization_id);

-- ─── 10. jobs ───────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  recruiter_id  text,
  title         text not null,
  location      text,
  description   text,
  status        text not null default 'active',
  organization_id uuid references public.organizations(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists jobs_org_idx on public.jobs(organization_id);

-- ─── 11. job_applications ───────────────────────────────────────────────────
create table if not exists public.job_applications (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references public.jobs(id) on delete cascade,
  driver_id   text,
  driver_uuid uuid,
  message     text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists job_applications_job_idx    on public.job_applications(job_id);
create index if not exists job_applications_driver_idx on public.job_applications(driver_uuid);

-- ─── 12. driver_incidents ───────────────────────────────────────────────────
create table if not exists public.driver_incidents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  incident_type   text,
  incident_date   timestamptz,
  description     text,
  severity        text,
  status          text not null default 'open',
  resolved_at     timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_incidents_org_idx    on public.driver_incidents(organization_id);
create index if not exists driver_incidents_driver_idx on public.driver_incidents(driver_id);

-- ─── 13. override_log ───────────────────────────────────────────────────────
create table if not exists public.override_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  entity_type     text,
  entity_id       text,
  field_name      text,
  old_value       text,
  new_value       text,
  reason          text,
  overridden_by   uuid,
  created_at      timestamptz not null default now()
);
create index if not exists override_log_org_idx    on public.override_log(organization_id);
create index if not exists override_log_entity_idx on public.override_log(entity_type, entity_id);

-- ─── 14. violations ─────────────────────────────────────────────────────────
create table if not exists public.violations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text,
  violation_type  text,
  violation_date  timestamptz,
  description     text,
  severity        text,
  status          text not null default 'open',
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists violations_org_idx    on public.violations(organization_id);
create index if not exists violations_driver_idx on public.violations(driver_id);

-- ─── 15. safety_records ─────────────────────────────────────────────────────
create table if not exists public.safety_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text,
  record_type     text,
  record_date     timestamptz,
  description     text,
  attachments     jsonb not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists safety_records_org_idx    on public.safety_records(organization_id);
create index if not exists safety_records_driver_idx on public.safety_records(driver_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.branding          enable row level security;
alter table public.intel_verify_queue enable row level security;
alter table public.intel_verify_audit enable row level security;
alter table public.dvir              enable row level security;
alter table public.driver_layouts    enable row level security;
alter table public.dispatch_messages enable row level security;
alter table public.plants            enable row level security;
alter table public.scans             enable row level security;
alter table public.job_postings      enable row level security;
alter table public.jobs              enable row level security;
alter table public.job_applications  enable row level security;
alter table public.driver_incidents  enable row level security;
alter table public.override_log      enable row level security;
alter table public.violations        enable row level security;
alter table public.safety_records    enable row level security;

create policy if not exists "auth_all_branding"           on public.branding           for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_intel_verify_queue" on public.intel_verify_queue for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_intel_verify_audit" on public.intel_verify_audit for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dvir"               on public.dvir               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_layouts"     on public.driver_layouts     for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dispatch_messages"  on public.dispatch_messages  for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_plants"             on public.plants             for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_scans"              on public.scans              for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_job_postings"       on public.job_postings       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_jobs"               on public.jobs               for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_job_applications"   on public.job_applications   for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_incidents"   on public.driver_incidents   for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_override_log"       on public.override_log       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_violations"         on public.violations         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_safety_records"     on public.safety_records     for all using (auth.role() = 'authenticated');
