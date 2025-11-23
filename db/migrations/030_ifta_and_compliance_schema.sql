-- Migration: IFTA and Compliance schema
-- Create core tables for per-jurisdiction miles/gallons, rates, filings, and compliance tracking

create extension if not exists "pgcrypto";

-- Jurisdictions (state/province codes)
create table if not exists public.ifta_jurisdictions (
  code text primary key,         -- e.g., TX, NC, GA
  name text not null
);

comment on table public.ifta_jurisdictions is 'IFTA jurisdictions (state/province codes)';

-- Quarterly fuel tax rates (per gallon)
create table if not exists public.ifta_rates (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  quarter int not null check (quarter between 1 and 4),
  jurisdiction_code text references public.ifta_jurisdictions(code) on delete cascade,
  fuel_type text default 'Diesel',
  rate_per_gallon numeric(10,4) not null
);
create index if not exists idx_ifta_rates_yq on public.ifta_rates(year, quarter);
create index if not exists idx_ifta_rates_juris on public.ifta_rates(jurisdiction_code);

comment on table public.ifta_rates is 'IFTA per-jurisdiction rates by quarter/year';

-- ELD trips (high level)
create table if not exists public.eld_trips (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid references public.fleets(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  total_miles numeric(10,2)
);
create index if not exists idx_eld_trips_time on public.eld_trips(start_time, end_time);

-- Per-jurisdiction segments for a trip
create table if not exists public.eld_trip_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.eld_trips(id) on delete cascade,
  jurisdiction_code text references public.ifta_jurisdictions(code) on delete set null,
  miles numeric(10,2) not null default 0
);
create index if not exists idx_eld_trip_segments_trip on public.eld_trip_segments(trip_id);
create index if not exists idx_eld_trip_segments_juris on public.eld_trip_segments(jurisdiction_code);

-- Fuel purchases
create table if not exists public.fuel_purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  jurisdiction_code text references public.ifta_jurisdictions(code) on delete set null,
  truck_id uuid references public.fleets(id) on delete set null,
  vendor text,
  gallons numeric(10,3) not null default 0,
  amount numeric(10,2) not null default 0,
  receipt_url text
);
create index if not exists idx_fuel_purchases_date on public.fuel_purchases(purchase_date);
create index if not exists idx_fuel_purchases_juris on public.fuel_purchases(jurisdiction_code);

comment on table public.fuel_purchases is 'Fuel purchases used to compute MPG and tax paid per jurisdiction';

-- IFTA filings (saved snapshots)
create table if not exists public.ifta_quarter_filings (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  quarter int not null check (quarter between 1 and 4),
  prepared_at timestamptz default now(),
  filed_at timestamptz,
  status text default 'Draft', -- Draft, Filed
  summary_json jsonb,          -- stored summary snapshot
  pdf_url text                 -- stored PDF copy if uploaded
);
create index if not exists idx_ifta_quarter_filings_yq on public.ifta_quarter_filings(year, quarter);

-- Compliance items (BOC-3, UCR, insurance, DOT inspections)
create table if not exists public.compliance_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,          -- BOC-3, UCR, Insurance Certificate, DOT Inspection
  entity text,                      -- company/truck identifier
  identifier text,                  -- policy number, DOT number, etc
  effective_date date,
  expiration_date date,
  status text default 'Active',
  document_url text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_compliance_items_type on public.compliance_items(item_type);
create index if not exists idx_compliance_items_exp on public.compliance_items(expiration_date);

comment on table public.compliance_items is 'Track key compliance artifacts with expiry alerts';
