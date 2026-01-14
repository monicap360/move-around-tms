-- Migration 062: 3PL billing upgrades and multi-tenant invoices

-- Add organization scoping to invoices and vendors
alter table public.invoices
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists client_organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists carrier_id uuid references public.carriers(id) on delete set null,
  add column if not exists billing_model text check (billing_model in ('pass_through','margin','percent')) default 'pass_through',
  add column if not exists margin_rate numeric(5,2),
  add column if not exists fee_rate numeric(5,2);

create index if not exists idx_invoices_org on public.invoices(organization_id);
create index if not exists idx_invoices_client_org on public.invoices(client_organization_id);
create index if not exists idx_invoices_carrier on public.invoices(carrier_id);

alter table public.vendors
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_vendors_org on public.vendors(organization_id);

-- 3PL billing profiles (per client)
create table if not exists public.3pl_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_organization_id uuid not null references public.organizations(id) on delete cascade,
  billing_model text not null check (billing_model in ('pass_through','margin','percent')),
  margin_rate numeric(5,2) default 0,
  fee_rate numeric(5,2) default 0,
  currency text default 'USD',
  terms text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_3pl_billing_profile_client
  on public.3pl_billing_profiles(organization_id, client_organization_id);
