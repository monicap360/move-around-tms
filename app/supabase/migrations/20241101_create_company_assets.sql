-- Migration: Create company_assets table
-- Description: Table for storing company logos and ticket templates with user-level access control

-- Table: public.company_assets
create table public.company_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  asset_type text check (asset_type in ('company_logo','ticket_template')) not null,
  file_path text not null,
  original_filename text not null,
  description text,
  file_size bigint,
  mime_type text,
  tags text[],
  metadata jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.company_assets enable row level security;

-- RLS Policy: Allow users to insert their own records
create policy "insert_own_assets"
on public.company_assets
for insert to authenticated
with check (user_id = (select auth.uid()));

-- RLS Policy: Allow users to read their own records
create policy "read_own_assets"
on public.company_assets
for select to authenticated
using (user_id = (select auth.uid()));

-- RLS Policy: Allow users to update their own records
create policy "update_own_assets"
on public.company_assets
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- RLS Policy: Allow users to delete their own records
create policy "delete_own_assets"
on public.company_assets
for delete to authenticated
using (user_id = (select auth.uid()));

-- Performance index for common queries
create index idx_company_assets_user_created on public.company_assets(user_id, created_at desc);

-- Index for asset type filtering
create index idx_company_assets_type on public.company_assets(asset_type, user_id);

-- Comments for documentation
comment on table public.company_assets is 'Stores company assets like logos and ticket templates with user-level access control';
comment on column public.company_assets.asset_type is 'Type of asset: company_logo or ticket_template';
comment on column public.company_assets.file_path is 'Storage path to the asset file';
comment on column public.company_assets.tags is 'Array of tags for categorization';
comment on column public.company_assets.metadata is 'Additional metadata in JSON format';