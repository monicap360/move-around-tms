-- Migration 050: Phase 1 schema alignment (Postgres)

-- Customers (dump truck specific)
create table if not exists public.ronyx_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  customer_name text not null,
  customer_type text check (
    customer_type in ('general_contractor', 'subcontractor', 'broker', 'government', 'private')
  ),
  billing_contact_name text,
  billing_email text,
  billing_phone text,
  payment_terms text check (
    payment_terms in ('net_15', 'net_30', 'net_45', 'net_60', 'cod', 'weekly')
  ),
  credit_limit numeric(12,2),
  average_days_to_pay integer default 30,
  tax_id text,
  insurance_expiry date,
  lien_waiver_required boolean not null default true,
  created_at timestamptz not null default now()
);

-- Projects / jobs
create table if not exists public.ronyx_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  customer_id uuid references public.ronyx_customers(id),
  project_code text unique,
  project_name text,
  project_address text,
  project_manager text,
  start_date date,
  estimated_end_date date,
  contract_amount numeric(12,2),
  retainage_percent numeric(5,2) default 10.00,
  contract_file_path text,
  rate_per_ton numeric(8,2),
  rate_per_cy numeric(8,2),
  rate_per_load numeric(8,2),
  min_daily_rate numeric(8,2),
  fuel_surcharge_applicable boolean not null default true,
  waiting_rate_per_minute numeric(8,2) default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Extend aggregate_tickets to Phase 1 fields
alter table public.aggregate_tickets
  add column if not exists ticket_id text,
  add column if not exists project_id uuid references public.ronyx_projects(id),
  add column if not exists customer_id uuid references public.ronyx_customers(id),
  add column if not exists material_type text,
  add column if not exists load_weight numeric(10,2),
  add column if not exists weight_ticket_number text,
  add column if not exists cubic_yards numeric(8,2),
  add column if not exists load_count smallint,
  add column if not exists pickup_location text,
  add column if not exists pickup_gps_lat numeric(10,8),
  add column if not exists pickup_gps_lon numeric(11,8),
  add column if not exists dump_location text,
  add column if not exists dump_gps_lat numeric(10,8),
  add column if not exists dump_gps_lon numeric(11,8),
  add column if not exists calculated_distance numeric(6,2),
  add column if not exists load_time timestamptz,
  add column if not exists dump_time timestamptz,
  add column if not exists waiting_minutes integer default 0,
  add column if not exists submitted_by uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists has_photo boolean not null default false,
  add column if not exists has_signature boolean not null default false,
  add column if not exists weight_ticket_verified boolean not null default false;

create unique index if not exists idx_aggregate_tickets_ticket_id
  on public.aggregate_tickets(ticket_id);

-- Extend trucks with capacity and maintenance
alter table public.trucks
  add column if not exists capacity_tons numeric(6,2),
  add column if not exists capacity_cy numeric(6,2),
  add column if not exists fuel_type text check (fuel_type in ('diesel','gas','cng')),
  add column if not exists avg_mpg numeric(4,2),
  add column if not exists last_maintenance date,
  add column if not exists next_maintenance date,
  add column if not exists insurance_expiry date,
  add column if not exists registration_expiry date,
  add column if not exists current_driver_id uuid;

-- Extend drivers with employment fields
alter table public.drivers
  add column if not exists employee_id text,
  add column if not exists cdl_number text,
  add column if not exists cdl_expiry date,
  add column if not exists phone_number text,
  add column if not exists email text,
  add column if not exists hourly_rate numeric(8,2),
  add column if not exists per_load_bonus numeric(8,2),
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text;

-- Basic invoices table used by Ronyx UI
create table if not exists public.ronyx_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  invoice_number text unique not null,
  customer_id uuid references public.ronyx_customers(id),
  customer_name text,
  project_id uuid references public.ronyx_projects(id),
  issued_date date,
  due_date date,
  subtotal numeric(12,2),
  fuel_surcharge numeric(12,2),
  waiting_charges numeric(12,2),
  tax_amount numeric(12,2),
  total_amount numeric(12,2),
  retainage_amount numeric(12,2),
  net_payable numeric(12,2),
  ticket_ids uuid[] default '{}',
  status text default 'open',
  payment_status text default 'unpaid',
  accounting_status text default 'not_exported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
