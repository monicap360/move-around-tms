-- =====================================================
-- Complete Database-Driven Admin Control Migration
-- =====================================================
-- Run this in Supabase SQL Editor to set up proper admin control
-- This replaces hardcoded admin checks with database-driven system

-- =====================================================
-- 1. Admins Table
-- =====================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_users_user_id
  on public.admin_users(user_id);

-- Insert your admins (Monica, Sylvia, Veronica)
insert into public.admin_users (user_id)
values
  ('74b71a1e-41e6-426e-9453-9ec6d99979dd'), -- Monica
  ('0b07b12d-a6a5-4b37-b786-7da42ec3a52d'), -- Sylvia
  ('3b9d4bd6-6b51-4ad6-be97-e3b1c39bcf74')  -- Veronica
on conflict (user_id) do nothing;

-- =====================================================
-- 2. Helper: is_admin()
-- =====================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- =====================================================
-- 3. Optional Helper: first_folder_segment()
-- =====================================================
create or replace function public.first_folder_segment(path text)
returns text
language sql
immutable
as $$
  select split_part(path, '/', 1);
$$;

-- =====================================================
-- 4. Clean up old JWT / UUID-based policies
-- =====================================================
drop policy if exists "company_assets_admin_all" on storage.objects;
drop policy if exists "company_assets_shared_write_admin" on storage.objects;
drop policy if exists "company_assets_shared_update_admin" on storage.objects;
drop policy if exists "company_assets_shared_delete_admin" on storage.objects;
drop policy if exists "company_assets_admin_view_all" on storage.objects;
drop policy if exists "company_assets_admin_upload_all" on storage.objects;
drop policy if exists "company_assets_admin_update_all" on storage.objects;
drop policy if exists "company_assets_admin_delete_all" on storage.objects;
drop policy if exists "company_assets_read_shared" on storage.objects;
drop policy if exists "company_assets_write_delete_shared_admins" on storage.objects;

-- =====================================================
-- 5. Shared Folder Policies
-- =====================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='company_assets_shared_read'
  ) then
    create policy "company_assets_shared_read"
    on storage.objects
    for select to authenticated
    using (
      bucket_id='company_assets'
      and public.first_folder_segment(name)='shared'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='company_assets_shared_write_admin_db'
  ) then
    create policy "company_assets_shared_write_admin_db"
    on storage.objects
    for insert to authenticated
    with check (
      bucket_id='company_assets'
      and public.first_folder_segment(name)='shared'
      and public.is_admin()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='company_assets_shared_update_admin_db'
  ) then
    create policy "company_assets_shared_update_admin_db"
    on storage.objects
    for update to authenticated
    using (
      bucket_id='company_assets'
      and public.first_folder_segment(name)='shared'
      and public.is_admin()
    )
    with check (
      bucket_id='company_assets'
      and public.first_folder_segment(name)='shared'
      and public.is_admin()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='company_assets_shared_delete_admin_db'
  ) then
    create policy "company_assets_shared_delete_admin_db"
    on storage.objects
    for delete to authenticated
    using (
      bucket_id='company_assets'
      and public.first_folder_segment(name)='shared'
      and public.is_admin()
    );
  end if;
end $$;

-- =====================================================
-- 6. Global Admin Override (Optional)
-- =====================================================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='company_assets_admin_all_db'
  ) then
    create policy "company_assets_admin_all_db"
    on storage.objects
    as permissive
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

-- =====================================================
-- 7. Verify RLS Enabled
-- =====================================================
alter table storage.objects enable row level security;

-- =====================================================
-- 8. Update company_assets_objects view for admins
-- =====================================================
create or replace view company_assets_objects as
select 
  o.id,
  o.name,
  o.created_at,
  o.updated_at,
  o.last_accessed_at,
  o.metadata,
  public.first_folder_segment(o.name) as user_folder,
  case 
    when public.is_admin() then 'admin'
    else auth.uid()::text
  end as access_level
from storage.objects o
where 
  o.bucket_id = 'company_assets'
  and (
    -- Regular users see only their files
    (not public.is_admin() and public.first_folder_segment(o.name) = auth.uid()::text)
    or
    -- Regular users can see shared files
    (public.first_folder_segment(o.name) = 'shared')
    or
    -- Admins see all files
    public.is_admin()
  );

-- =====================================================
-- 9. Verification Queries
-- =====================================================
-- Test these after running the migration:
-- 
-- Check if you're admin:
-- select public.is_admin();
--
-- List admin users:
-- select * from public.admin_users;
--
-- Test view as admin vs regular user:
-- select * from company_assets_objects;