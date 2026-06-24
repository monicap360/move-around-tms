-- Migration 209: Create tables referenced in code but missing from all prior migrations.
-- Safe to re-run (CREATE TABLE IF NOT EXISTS throughout).

-- ─── 1. fleetpulse_driver_day ───────────────────────────────────────────────
create table if not exists public.fleetpulse_driver_day (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_uuid     uuid,
  driver_id       text,
  date            date,
  first_load      timestamptz,
  last_load       timestamptz,
  total_loads     integer not null default 0,
  total_tons      numeric(12,2) not null default 0,
  total_miles     numeric(12,2) not null default 0,
  idle_minutes    integer not null default 0,
  pit_stops       integer not null default 0,
  efficiency_score numeric(5,2),
  raw_data        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists fleetpulse_driver_day_driver_idx on public.fleetpulse_driver_day(driver_uuid);
create index if not exists fleetpulse_driver_day_date_idx   on public.fleetpulse_driver_day(date);
create index if not exists fleetpulse_driver_day_org_idx    on public.fleetpulse_driver_day(organization_id);

-- ─── 2. fleetpulse_idle_events ──────────────────────────────────────────────
create table if not exists public.fleetpulse_idle_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_uuid     uuid,
  driver_id       text,
  truck_id        text,
  event_type      text not null default 'idle',
  location        text,
  started_at      timestamptz,
  ended_at        timestamptz,
  duration_minutes integer not null default 0,
  notes           text,
  raw_data        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists fleetpulse_idle_events_driver_idx on public.fleetpulse_idle_events(driver_uuid);
create index if not exists fleetpulse_idle_events_org_idx    on public.fleetpulse_idle_events(organization_id);

-- ─── 3. fleetpulse_pit_scores ───────────────────────────────────────────────
create table if not exists public.fleetpulse_pit_scores (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  pit_name        text,
  pit_id          text,
  date            date,
  avg_wait_minutes numeric(8,2),
  total_loads     integer not null default 0,
  total_tons      numeric(12,2) not null default 0,
  score           numeric(5,2),
  raw_data        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists fleetpulse_pit_scores_pit_idx on public.fleetpulse_pit_scores(pit_id);
create index if not exists fleetpulse_pit_scores_org_idx on public.fleetpulse_pit_scores(organization_id);

-- ─── 4. fleetpulse_truck_scores ─────────────────────────────────────────────
create table if not exists public.fleetpulse_truck_scores (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  truck_id        text,
  truck_number    text,
  date            date,
  total_loads     integer not null default 0,
  total_tons      numeric(12,2) not null default 0,
  total_miles     numeric(12,2) not null default 0,
  uptime_pct      numeric(5,2),
  efficiency_score numeric(5,2),
  raw_data        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index if not exists fleetpulse_truck_scores_truck_idx on public.fleetpulse_truck_scores(truck_id);
create index if not exists fleetpulse_truck_scores_org_idx   on public.fleetpulse_truck_scores(organization_id);

-- ─── 5. ai_contract_analysis ────────────────────────────────────────────────
create table if not exists public.ai_contract_analysis (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  contract_name   text,
  file_url        text,
  status          text not null default 'pending',
  analysis_result jsonb not null default '{}',
  risk_flags      jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  analyzed_by     uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ai_contract_analysis_org_idx on public.ai_contract_analysis(organization_id);

-- ─── 6. ai_excel_compare_results ────────────────────────────────────────────
create table if not exists public.ai_excel_compare_results (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  file_a_name     text,
  file_b_name     text,
  status          text not null default 'pending',
  match_pct       numeric(5,2),
  discrepancies   jsonb not null default '[]',
  summary         jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ai_excel_compare_org_idx on public.ai_excel_compare_results(organization_id);

-- ─── 7. ai_payroll_analysis ─────────────────────────────────────────────────
create table if not exists public.ai_payroll_analysis (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  pay_period_start date,
  pay_period_end   date,
  status          text not null default 'pending',
  anomalies       jsonb not null default '[]',
  summary         jsonb not null default '{}',
  total_flagged   integer not null default 0,
  analyzed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ai_payroll_analysis_org_idx on public.ai_payroll_analysis(organization_id);

-- ─── 8. ai_ticket_forensics ─────────────────────────────────────────────────
create table if not exists public.ai_ticket_forensics (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  ticket_id       text,
  scan_id         uuid,
  findings        jsonb not null default '[]',
  fraud_risk      text not null default 'low',
  confidence      numeric(5,4) not null default 0,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ai_ticket_forensics_org_idx    on public.ai_ticket_forensics(organization_id);
create index if not exists ai_ticket_forensics_ticket_idx on public.ai_ticket_forensics(ticket_id);

-- ─── 9. driver_compliance_audit_log ─────────────────────────────────────────
create table if not exists public.driver_compliance_audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  action          text not null,
  field_name      text,
  old_value       text,
  new_value       text,
  performed_by    uuid,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists driver_compliance_audit_driver_idx on public.driver_compliance_audit_log(driver_id);
create index if not exists driver_compliance_audit_org_idx    on public.driver_compliance_audit_log(organization_id);

-- ─── 10. driver_onboarding_workflows ────────────────────────────────────────
create table if not exists public.driver_onboarding_workflows (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_email    text not null,
  step_name       text not null,
  step_order      integer not null default 1,
  status          text not null default 'pending',
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_onboarding_wf_email_idx on public.driver_onboarding_workflows(driver_email);
create index if not exists driver_onboarding_wf_org_idx   on public.driver_onboarding_workflows(organization_id);

-- ─── 11. driver_performance_summary ─────────────────────────────────────────
create table if not exists public.driver_performance_summary (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_uuid     uuid,
  driver_id       text,
  period_start    date not null,
  period_end      date not null,
  total_loads     integer not null default 0,
  total_tons      numeric(12,2) not null default 0,
  total_miles     numeric(12,2) not null default 0,
  on_time_pct     numeric(5,2),
  safety_score    numeric(5,2),
  efficiency_score numeric(5,2),
  incidents       integer not null default 0,
  violations      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_perf_summary_driver_idx on public.driver_performance_summary(driver_uuid);
create index if not exists driver_perf_summary_org_idx    on public.driver_performance_summary(organization_id);
create index if not exists driver_perf_summary_period_idx on public.driver_performance_summary(period_start, period_end);

-- ─── 12. driver_qualifications ──────────────────────────────────────────────
create table if not exists public.driver_qualifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text not null,
  driver_uuid     uuid,
  truck_type      text not null,
  qualified       boolean not null default false,
  certified_at    timestamptz,
  expires_at      timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists driver_qualifications_driver_idx on public.driver_qualifications(driver_id);
create index if not exists driver_qualifications_org_idx    on public.driver_qualifications(organization_id);

-- ─── 13. drivers_enhanced (wide view table for HR driver listing) ────────────
create table if not exists public.drivers_enhanced (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_id       text,
  driver_uuid     uuid,
  full_name       text,
  email           text,
  phone           text,
  status          text not null default 'active',
  cdl_class       text,
  cdl_expires_at  date,
  med_card_expires_at date,
  drug_test_status text,
  background_check_status text,
  hire_date       date,
  termination_date date,
  pay_type        text,
  pay_rate        numeric(12,2),
  truck_assigned  text,
  performance_score numeric(5,2),
  compliance_score  numeric(5,2),
  extra_fields    jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists drivers_enhanced_org_idx    on public.drivers_enhanced(organization_id);
create index if not exists drivers_enhanced_driver_idx on public.drivers_enhanced(driver_uuid);
create index if not exists drivers_enhanced_status_idx on public.drivers_enhanced(status);

-- ─── 14. dispatcher_ratings ─────────────────────────────────────────────────
create table if not exists public.dispatcher_ratings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_uuid     text not null,
  score           smallint not null check (score between 1 and 5),
  feedback        text,
  created_at      timestamptz not null default now()
);
create index if not exists dispatcher_ratings_driver_idx on public.dispatcher_ratings(driver_uuid);
create index if not exists dispatcher_ratings_org_idx    on public.dispatcher_ratings(organization_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.fleetpulse_driver_day       enable row level security;
alter table public.fleetpulse_idle_events      enable row level security;
alter table public.fleetpulse_pit_scores       enable row level security;
alter table public.fleetpulse_truck_scores     enable row level security;
alter table public.ai_contract_analysis        enable row level security;
alter table public.ai_excel_compare_results    enable row level security;
alter table public.ai_payroll_analysis         enable row level security;
alter table public.ai_ticket_forensics         enable row level security;
alter table public.driver_compliance_audit_log enable row level security;
alter table public.driver_onboarding_workflows enable row level security;
alter table public.driver_performance_summary  enable row level security;
alter table public.driver_qualifications       enable row level security;
alter table public.drivers_enhanced            enable row level security;
alter table public.dispatcher_ratings          enable row level security;

create policy if not exists "auth_all_fleetpulse_driver_day"       on public.fleetpulse_driver_day       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fleetpulse_idle_events"      on public.fleetpulse_idle_events      for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fleetpulse_pit_scores"       on public.fleetpulse_pit_scores       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_fleetpulse_truck_scores"     on public.fleetpulse_truck_scores     for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ai_contract_analysis"        on public.ai_contract_analysis        for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ai_excel_compare_results"    on public.ai_excel_compare_results    for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ai_payroll_analysis"         on public.ai_payroll_analysis         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_ai_ticket_forensics"         on public.ai_ticket_forensics         for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_compliance_audit_log" on public.driver_compliance_audit_log for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_onboarding_workflows" on public.driver_onboarding_workflows for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_performance_summary"  on public.driver_performance_summary  for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_driver_qualifications"       on public.driver_qualifications       for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_drivers_enhanced"            on public.drivers_enhanced            for all using (auth.role() = 'authenticated');
create policy if not exists "auth_all_dispatcher_ratings"          on public.dispatcher_ratings          for all using (auth.role() = 'authenticated');
