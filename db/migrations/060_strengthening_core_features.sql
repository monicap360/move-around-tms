-- Migration 060: Strengthen core feature tables

-- 1) 3PL organization relationships
create table if not exists public.organization_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_organization_id uuid not null references public.organizations(id) on delete cascade,
  child_organization_id uuid not null references public.organizations(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('3pl_client', 'carrier_partner')),
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_org_relationships_parent on public.organization_relationships(parent_organization_id);
create index if not exists idx_org_relationships_child on public.organization_relationships(child_organization_id);

-- 2) Carrier management
create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  mc_number text,
  dot_number text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_carriers_org on public.carriers(organization_id);
create index if not exists idx_carriers_status on public.carriers(status);

-- 3) Carrier rate management
create table if not exists public.carrier_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  carrier_id uuid not null references public.carriers(id) on delete cascade,
  lane_origin text,
  lane_destination text,
  unit_type text check (unit_type in ('Load','Yard','Ton','Hour','Mile')) default 'Load',
  rate numeric(12,2) not null default 0,
  effective_from date,
  effective_to date,
  fuel_surcharge numeric(5,2) default 0,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_carrier_rates_org on public.carrier_rates(organization_id);
create index if not exists idx_carrier_rates_carrier on public.carrier_rates(carrier_id);

-- 4) Tracking updates (for real-time tracking)
create table if not exists public.tracking_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  load_request_id uuid,
  status text not null,
  location text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_tracking_updates_org on public.tracking_updates(organization_id);
create index if not exists idx_tracking_updates_created on public.tracking_updates(created_at desc);

-- 5) API keys for external integrations
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_api_keys_org on public.api_keys(organization_id);
create index if not exists idx_api_keys_revoked on public.api_keys(revoked_at);
