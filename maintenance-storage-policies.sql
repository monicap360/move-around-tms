-- ============================================================
-- maintenance-docs Storage Bucket — RLS Policies
-- Run in Supabase SQL Editor (Storage section uses storage schema)
-- Drivers: no direct access — use signed URLs from server only
-- ============================================================

-- 0) Create bucket if it doesn't exist, ensure private
insert into storage.buckets (id, name, public)
values ('maintenance-docs', 'maintenance-docs', false)
on conflict (id) do update
  set public = false,
      name   = excluded.name;

-- 1) Drop old policies (safe to re-run)
drop policy if exists "maintenance_docs_ops_admin_read"   on storage.objects;
drop policy if exists "maintenance_docs_ops_admin_insert" on storage.objects;
drop policy if exists "maintenance_docs_ops_admin_update" on storage.objects;
drop policy if exists "maintenance_docs_ops_admin_delete" on storage.objects;

-- Role helper (checks app_role, app_metadata.role, or role claim — whichever your app sets)
-- Change to a single claim if you only use one, e.g.:
--   auth.jwt() -> 'app_metadata' ->> 'role'

-- 2) SELECT — admin/ops can list and download objects directly
create policy "maintenance_docs_ops_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'maintenance-docs'
  and coalesce(
    auth.jwt() ->> 'app_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  ) in ('admin', 'ops')
);

-- 3) INSERT — admin/ops can upload
create policy "maintenance_docs_ops_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'maintenance-docs'
  and coalesce(
    auth.jwt() ->> 'app_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  ) in ('admin', 'ops')
);

-- 4) UPDATE — admin/ops can rename/replace
create policy "maintenance_docs_ops_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'maintenance-docs'
  and coalesce(
    auth.jwt() ->> 'app_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  ) in ('admin', 'ops')
)
with check (
  bucket_id = 'maintenance-docs'
  and coalesce(
    auth.jwt() ->> 'app_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  ) in ('admin', 'ops')
);

-- 5) DELETE — admin/ops only
create policy "maintenance_docs_ops_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'maintenance-docs'
  and coalesce(
    auth.jwt() ->> 'app_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  ) in ('admin', 'ops')
);

-- ============================================================
-- HOW DRIVERS ACCESS DOCUMENTS (no direct bucket policy)
-- ============================================================
-- Drivers never hit the bucket directly. Your API route generates
-- a short-lived signed URL using the service role:
--
--   const { data } = await supabase.storage
--     .from('maintenance-docs')
--     .createSignedUrl(filePath, 3600); // 1-hour expiry
--
--   return NextResponse.json({ url: data.signedUrl });
--
-- The driver's browser hits the signed URL directly — no auth
-- header needed, Supabase validates the token in the URL itself.
-- ============================================================

-- VERIFY: Run this after applying — should return 4 rows
select policyname, cmd
from pg_policies
where tablename = 'objects'
  and policyname like 'maintenance_docs%'
order by cmd;
