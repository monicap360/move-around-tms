-- Migration 063: Material matching & reconciliation system

create table if not exists public.matching_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'running' check (status in ('running','completed','failed')),
  input_counts jsonb default '{}'::jsonb,
  matched_count int default 0,
  exception_count int default 0,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.pit_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  material_number text not null,
  batch_lot text,
  quantity numeric(12,3) not null,
  uom text not null,
  received_date date,
  price numeric(12,2),
  source_reference text,
  created_at timestamptz default now()
);

create table if not exists public.material_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  material_number text not null,
  batch_lot text,
  quantity numeric(12,3) not null,
  uom text not null,
  receipt_date date,
  supplier text,
  po_number text,
  created_at timestamptz default now()
);

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  material_number text not null,
  batch_lot text,
  quantity numeric(12,3) not null,
  uom text not null,
  invoice_date date,
  unit_price numeric(12,2),
  total_amount numeric(12,2),
  invoice_number text,
  po_number text,
  created_at timestamptz default now()
);

create table if not exists public.po_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  material_number text not null,
  batch_lot text,
  quantity numeric(12,3) not null,
  uom text not null,
  po_date date,
  unit_price numeric(12,2),
  po_number text,
  supplier text,
  created_at timestamptz default now()
);

create table if not exists public.matched_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.matching_runs(id) on delete cascade,
  material_number text not null,
  batch_lot text,
  pit_id uuid references public.pit_data(id) on delete set null,
  receipt_id uuid references public.material_receipts(id) on delete set null,
  invoice_id uuid references public.supplier_invoices(id) on delete set null,
  po_id uuid references public.po_data(id) on delete set null,
  quantity_received numeric(12,3),
  quantity_billed numeric(12,3),
  uom text,
  unit_price_po numeric(12,2),
  unit_price_invoice numeric(12,2),
  delivery_date date,
  status text not null default 'matched' check (status in ('matched','partial','exception')),
  variance_pct numeric(8,2),
  price_variance_pct numeric(8,2),
  date_variance_days int,
  created_at timestamptz default now()
);

create table if not exists public.matching_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid not null references public.matching_runs(id) on delete cascade,
  matched_record_id uuid references public.matched_records(id) on delete cascade,
  exception_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  explanation text,
  created_at timestamptz default now()
);

create index if not exists idx_matching_runs_org on public.matching_runs(organization_id);
create index if not exists idx_pit_data_org on public.pit_data(organization_id);
create index if not exists idx_material_receipts_org on public.material_receipts(organization_id);
create index if not exists idx_supplier_invoices_org on public.supplier_invoices(organization_id);
create index if not exists idx_po_data_org on public.po_data(organization_id);
create index if not exists idx_matched_records_org on public.matched_records(organization_id);
create index if not exists idx_matching_exceptions_org on public.matching_exceptions(organization_id);

alter table public.matching_runs enable row level security;
alter table public.pit_data enable row level security;
alter table public.material_receipts enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.po_data enable row level security;
alter table public.matched_records enable row level security;
alter table public.matching_exceptions enable row level security;

create policy "matching_runs_select" on public.matching_runs for select using (true);
create policy "matching_runs_insert" on public.matching_runs for insert with check (true);
create policy "matching_runs_update" on public.matching_runs for update using (true);

create policy "pit_data_select" on public.pit_data for select using (true);
create policy "pit_data_insert" on public.pit_data for insert with check (true);

create policy "material_receipts_select" on public.material_receipts for select using (true);
create policy "material_receipts_insert" on public.material_receipts for insert with check (true);

create policy "supplier_invoices_select" on public.supplier_invoices for select using (true);
create policy "supplier_invoices_insert" on public.supplier_invoices for insert with check (true);

create policy "po_data_select" on public.po_data for select using (true);
create policy "po_data_insert" on public.po_data for insert with check (true);

create policy "matched_records_select" on public.matched_records for select using (true);
create policy "matched_records_insert" on public.matched_records for insert with check (true);

create policy "matching_exceptions_select" on public.matching_exceptions for select using (true);
create policy "matching_exceptions_insert" on public.matching_exceptions for insert with check (true);
