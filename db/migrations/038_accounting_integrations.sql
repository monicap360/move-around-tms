-- Migration 038: Accounting Integrations
-- Purpose: Store accounting software integration credentials and sync status

-- Accounting integrations table
create table if not exists public.accounting_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('quickbooks', 'xero')),
  access_token text, -- Encrypted in production
  refresh_token text, -- Encrypted in production
  realm_id text, -- QuickBooks company ID
  tenant_id text, -- Xero tenant ID
  expires_at timestamp,
  active boolean default true,
  connected_at timestamp,
  disconnected_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(organization_id, provider)
);

-- Accounting sync log
create table if not exists public.accounting_sync_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('quickbooks', 'xero')),
  sync_type text not null check (sync_type in ('invoices', 'payments', 'customers', 'vendors', 'accounts')),
  items_count integer default 0,
  success_count integer default 0,
  error_count integer default 0,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  synced_at timestamp,
  created_at timestamp default now()
);

-- Invoice sync mapping (map TMS invoices to accounting software invoices)
create table if not exists public.accounting_invoice_sync (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  provider text not null check (provider in ('quickbooks', 'xero')),
  provider_invoice_id text not null, -- Invoice ID in QuickBooks/Xero
  sync_status text default 'pending' check (sync_status in ('pending', 'synced', 'failed', 'updated')),
  last_synced_at timestamp,
  error_message text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(invoice_id, provider)
);

-- Indexes
create index if not exists idx_accounting_integrations_org on public.accounting_integrations(organization_id);
create index if not exists idx_accounting_integrations_provider on public.accounting_integrations(provider);
create index if not exists idx_accounting_integrations_active on public.accounting_integrations(active);

create index if not exists idx_accounting_sync_log_org on public.accounting_sync_log(organization_id);
create index if not exists idx_accounting_sync_log_provider on public.accounting_sync_log(provider);
create index if not exists idx_accounting_sync_log_type on public.accounting_sync_log(sync_type);
create index if not exists idx_accounting_sync_log_created on public.accounting_sync_log(created_at);

create index if not exists idx_accounting_invoice_sync_org on public.accounting_invoice_sync(organization_id);
create index if not exists idx_accounting_invoice_sync_invoice on public.accounting_invoice_sync(invoice_id);
create index if not exists idx_accounting_invoice_sync_provider on public.accounting_invoice_sync(provider);
create index if not exists idx_accounting_invoice_sync_status on public.accounting_invoice_sync(sync_status);

-- Comments
comment on table public.accounting_integrations is 'Accounting software integration credentials (QuickBooks, Xero)';
comment on table public.accounting_sync_log is 'Log of accounting sync operations';
comment on table public.accounting_invoice_sync is 'Mapping between TMS invoices and accounting software invoices';
