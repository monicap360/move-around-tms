-- Migration 067: Import audits for spreadsheet ingestion

create table if not exists public.import_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  import_type text not null,
  file_name text,
  rows_count int default 0,
  success_count int default 0,
  failure_count int default 0,
  error_count int default 0,
  warning_count int default 0,
  diagnostics jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_import_audits_org on public.import_audits(organization_id);
create index if not exists idx_import_audits_type on public.import_audits(import_type);

alter table public.import_audits enable row level security;

create policy "import_audits_select" on public.import_audits
  for select using (true);

create policy "import_audits_insert" on public.import_audits
  for insert with check (true);
