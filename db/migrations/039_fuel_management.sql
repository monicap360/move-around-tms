-- Migration 039: Fuel Management System
-- Purpose: Track fuel purchases, fuel card accounts, and fuel cost allocations

-- Fuel card accounts (Comdata, WEX, etc.)
create table if not exists public.fuel_card_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('comdata', 'wex', 'fleetcor', 'manual')),
  account_id text not null,
  account_name text,
  api_key text, -- Encrypted in production
  api_secret text, -- Encrypted in production
  card_count integer default 0,
  active boolean default true,
  connected_at timestamp,
  disconnected_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(organization_id, provider, account_id)
);

-- Fuel purchases (from fuel cards or manual entry)
create table if not exists public.fuel_purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_id text not null,
  card_number text,
  driver_id uuid references public.drivers(id) on delete set null,
  truck_id uuid references public.trucks(id) on delete set null,
  location text not null,
  gallons numeric(10,2) not null,
  cost_per_gallon numeric(10,4) not null,
  total_cost numeric(12,2) not null,
  fuel_type text default 'Diesel' check (fuel_type in ('Diesel', 'Gasoline', 'CNG', 'Electric', 'Other')),
  transaction_date date not null,
  odometer integer,
  provider text not null check (provider in ('comdata', 'wex', 'fleetcor', 'manual')),
  source text default 'manual' check (source in ('manual', 'import', 'api')),
  receipt_url text,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(organization_id, transaction_id, provider)
);

-- Fuel allocations (allocate fuel costs to loads, trucks, or drivers)
create table if not exists public.fuel_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fuel_purchase_id uuid not null references public.fuel_purchases(id) on delete cascade,
  allocation_type text not null check (allocation_type in ('load', 'truck', 'driver')),
  target_id uuid not null, -- load_id, truck_id, or driver_id
  target_type text not null check (target_type in ('load', 'truck', 'driver')),
  gallons numeric(10,2) not null,
  cost_per_gallon numeric(10,4) not null,
  total_cost numeric(12,2) not null,
  allocated_at timestamp not null,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Fuel import log (track imports from fuel card providers)
create table if not exists public.fuel_import_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('comdata', 'wex', 'fleetcor')),
  start_date date not null,
  end_date date not null,
  transactions_imported integer default 0,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  imported_at timestamp,
  created_at timestamp default now()
);

-- Indexes
create index if not exists idx_fuel_card_accounts_org on public.fuel_card_accounts(organization_id);
create index if not exists idx_fuel_card_accounts_provider on public.fuel_card_accounts(provider);
create index if not exists idx_fuel_card_accounts_active on public.fuel_card_accounts(active);

create index if not exists idx_fuel_purchases_org on public.fuel_purchases(organization_id);
create index if not exists idx_fuel_purchases_driver on public.fuel_purchases(driver_id);
create index if not exists idx_fuel_purchases_truck on public.fuel_purchases(truck_id);
create index if not exists idx_fuel_purchases_date on public.fuel_purchases(transaction_date);
create index if not exists idx_fuel_purchases_provider on public.fuel_purchases(provider);
create index if not exists idx_fuel_purchases_transaction on public.fuel_purchases(transaction_id);

create index if not exists idx_fuel_allocations_org on public.fuel_allocations(organization_id);
create index if not exists idx_fuel_allocations_purchase on public.fuel_allocations(fuel_purchase_id);
create index if not exists idx_fuel_allocations_target on public.fuel_allocations(target_id, target_type);
create index if not exists idx_fuel_allocations_type on public.fuel_allocations(allocation_type);

create index if not exists idx_fuel_import_log_org on public.fuel_import_log(organization_id);
create index if not exists idx_fuel_import_log_provider on public.fuel_import_log(provider);
create index if not exists idx_fuel_import_log_date on public.fuel_import_log(imported_at);

-- Comments
comment on table public.fuel_card_accounts is 'Fuel card provider accounts (Comdata, WEX, Fleetcor)';
comment on table public.fuel_purchases is 'Fuel purchase transactions from fuel cards or manual entry';
comment on table public.fuel_allocations is 'Fuel cost allocations to loads, trucks, or drivers';
comment on table public.fuel_import_log is 'Log of fuel transaction imports from fuel card providers';
