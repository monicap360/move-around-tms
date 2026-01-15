-- Migration 068: Aggregate reconciliation system

alter table public.aggregate_tickets
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists gross_weight numeric(12,2),
  add column if not exists tare_weight numeric(12,2),
  add column if not exists net_weight numeric(12,2),
  add column if not exists moisture_pct numeric(6,3),
  add column if not exists scale_type text,
  add column if not exists scale_source text,
  add column if not exists delivery_ticket_number text,
  add column if not exists invoice_number text,
  add column if not exists delivery_site text,
  add column if not exists customer_name text,
  add column if not exists uom text;

create table if not exists public.aggregate_lab_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_number text,
  batch_lot text,
  material text,
  moisture_pct numeric(6,3),
  fines_pct numeric(6,3),
  gradation jsonb default '{}'::jsonb,
  contamination_notes text,
  strength_mpa numeric(8,2),
  test_date date,
  status text default 'pass' check (status in ('pass','fail','hold')),
  created_at timestamptz default now()
);

create table if not exists public.aggregate_delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_number text,
  delivered_at timestamptz,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  geofence_match boolean default false,
  signature_url text,
  photo_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.aggregate_tolerance_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scale_tolerance_pct numeric(6,3) default 2,
  moisture_tolerance_pct numeric(6,3) default 1,
  fines_tolerance_pct numeric(6,3) default 1,
  price_variance_pct numeric(6,3) default 5,
  delivery_window_hours int default 12,
  location_radius_meters int default 200,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.aggregate_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'running' check (status in ('running','completed','failed')),
  input_counts jsonb default '{}'::jsonb,
  matched_count int default 0,
  exception_count int default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.aggregate_reconciliation_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.aggregate_reconciliation_runs(id) on delete cascade,
  ticket_id uuid references public.aggregate_tickets(id) on delete set null,
  ticket_number text,
  status text not null default 'matched' check (status in ('matched','partial','exception')),
  quantity_variance_pct numeric(8,2),
  quality_variance_pct numeric(8,2),
  delivery_variance_hours int,
  price_variance_pct numeric(8,2),
  created_at timestamptz default now()
);

create table if not exists public.aggregate_reconciliation_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.aggregate_reconciliation_runs(id) on delete cascade,
  result_id uuid references public.aggregate_reconciliation_results(id) on delete cascade,
  exception_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  explanation text,
  created_at timestamptz default now()
);

create index if not exists idx_agg_lab_results_org on public.aggregate_lab_results(organization_id);
create index if not exists idx_agg_delivery_proofs_org on public.aggregate_delivery_proofs(organization_id);
create index if not exists idx_agg_tolerance_org on public.aggregate_tolerance_settings(organization_id);
create index if not exists idx_agg_recon_runs_org on public.aggregate_reconciliation_runs(organization_id);
create index if not exists idx_agg_recon_results_org on public.aggregate_reconciliation_results(organization_id);
create index if not exists idx_agg_recon_exceptions_org on public.aggregate_reconciliation_exceptions(organization_id);

alter table public.aggregate_lab_results enable row level security;
alter table public.aggregate_delivery_proofs enable row level security;
alter table public.aggregate_tolerance_settings enable row level security;
alter table public.aggregate_reconciliation_runs enable row level security;
alter table public.aggregate_reconciliation_results enable row level security;
alter table public.aggregate_reconciliation_exceptions enable row level security;

create policy "agg_lab_results_select" on public.aggregate_lab_results for select using (true);
create policy "agg_lab_results_insert" on public.aggregate_lab_results for insert with check (true);

create policy "agg_delivery_proofs_select" on public.aggregate_delivery_proofs for select using (true);
create policy "agg_delivery_proofs_insert" on public.aggregate_delivery_proofs for insert with check (true);

create policy "agg_tolerance_select" on public.aggregate_tolerance_settings for select using (true);
create policy "agg_tolerance_insert" on public.aggregate_tolerance_settings for insert with check (true);
create policy "agg_tolerance_update" on public.aggregate_tolerance_settings for update using (true);

create policy "agg_recon_runs_select" on public.aggregate_reconciliation_runs for select using (true);
create policy "agg_recon_runs_insert" on public.aggregate_reconciliation_runs for insert with check (true);
create policy "agg_recon_runs_update" on public.aggregate_reconciliation_runs for update using (true);

create policy "agg_recon_results_select" on public.aggregate_reconciliation_results for select using (true);
create policy "agg_recon_results_insert" on public.aggregate_reconciliation_results for insert with check (true);

create policy "agg_recon_exceptions_select" on public.aggregate_reconciliation_exceptions for select using (true);
create policy "agg_recon_exceptions_insert" on public.aggregate_reconciliation_exceptions for insert with check (true);
