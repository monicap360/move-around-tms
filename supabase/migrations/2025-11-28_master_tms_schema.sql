
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  first_name text,
  last_name text,
  driver_uuid uuid unique not null,
  truck_id uuid references trucks(id),
  phone text,
  photo_url text,
  status text,
  created_at timestamptz default now()
);

-- 1a. organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  organization_code text unique not null,
  name text,
  created_at timestamptz default now()
);

create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  truck_number text,
  plate_number text,
  vin text,
  color text,
  status text,
  created_at timestamptz default now()
);

-- 2a. materials
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  name text,
  description text,
  created_at timestamptz default now()
);

-- 2b. plants
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  name text,
  address text,
  created_at timestamptz default now()
);

create table if not exists yards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  name text,
  address text,
  geofence jsonb,
  created_at timestamptz default now()
);

-- 4. driver_yard_events
create table if not exists driver_yard_events (
  id uuid primary key default gen_random_uuid(),
  driver_uuid uuid references drivers(driver_uuid),
  truck_id uuid references trucks(id),
  yard_id uuid references yards(id),

-- 5a. load_assignments
create table if not exists load_assignments (
  id uuid primary key default gen_random_uuid(),
  load_id uuid references loads(id),
  driver_id uuid references drivers(id),
  truck_id uuid references trucks(id),
  assigned_at timestamptz default now()
);

-- 5b. load_documents
create table if not exists load_documents (
  id uuid primary key default gen_random_uuid(),
  load_id uuid references loads(id),
  document_url text,
  uploaded_at timestamptz default now()
);
  event_type text check (event_type in ('enter','exit')),
  timestamp timestamptz,
  source text check (source in ('gps','manual'))
);

-- 5. loads
create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  driver_uuid uuid references drivers(driver_uuid),
  truck_id uuid references trucks(id),
  yard_id uuid references yards(id),
  plant text,
  material text,
  status text check (status in ('open','completed','in_review')),
  load_start timestamptz,
  load_end timestamptz,
  cycle_seconds integer,
  ticket_id uuid references aggregate_tickets(id),
  created_at timestamptz default now()
);

create table if not exists aggregate_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  driver_id uuid references drivers(id),
  driver_uuid uuid references drivers(driver_uuid),
  truck_id uuid references trucks(id),
  yard_id uuid references yards(id),
  plant text,
  material text,
  ticket_number text,
  ocr_gross numeric,
  ocr_tare numeric,
  ocr_net numeric,
  ocr_weight numeric,
  ocr_timestamp timestamptz,
  ocr_json jsonb,
  ocr_processed_at timestamptz,
  recon_gross numeric,
  recon_tare numeric,
  recon_net numeric,
  recon_material text,
  recon_plant text,
  recon_matched_by text,
  recon_status text,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6a. aggregates
create table if not exists aggregates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  name text,
  description text,
  created_at timestamptz default now()
);

-- 7. payroll_weeks
create table if not exists payroll_weeks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  week_start date,
  week_end date,
  created_at timestamptz default now()
);

create table if not exists payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_week_id uuid references payroll_weeks(id),
  driver_id uuid references drivers(id),
  organization_id uuid references organizations(id),
  total_loads integer,
  total_tons numeric,
  total_pay numeric,
  settlement_json jsonb,
  created_at timestamptz default now()
);

-- 9. driver_pay
create table if not exists driver_pay (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id),
  payroll_entry_id uuid references payroll_entries(id),
  pay_amount numeric,
  pay_type text,
  created_at timestamptz default now()
);

-- 10. RLS policies (templates, to be customized per table)
-- Example: Enable RLS and allow service_role access only
alter table drivers enable row level security;
create policy "Service role can access all drivers" on drivers for all to service_role using (true);

alter table trucks enable row level security;
create policy "Service role can access all trucks" on trucks for all to service_role using (true);

alter table loads enable row level security;
create policy "Service role can access all loads" on loads for all to service_role using (true);

alter table aggregate_tickets enable row level security;
create policy "Service role can access all tickets" on aggregate_tickets for all to service_role using (true);

alter table payroll_entries enable row level security;
create policy "Service role can access all payroll_entries" on payroll_entries for all to service_role using (true);

-- 11. Indexes for performance
create index if not exists idx_drivers_org on drivers(organization_id);
create index if not exists idx_trucks_org on trucks(organization_id);
create index if not exists idx_loads_org on loads(organization_id);
create index if not exists idx_aggregate_tickets_org on aggregate_tickets(organization_id);
create index if not exists idx_payroll_entries_org on payroll_entries(organization_id);
