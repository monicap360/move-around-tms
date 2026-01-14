-- Migration 061: Integration connection records

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'not_configured' check (status in ('not_configured','pending','connected','error')),
  last_synced_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_integration_connections_org on public.integration_connections(organization_id);
create index if not exists idx_integration_connections_provider on public.integration_connections(provider);
