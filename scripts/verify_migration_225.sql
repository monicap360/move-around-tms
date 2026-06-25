-- ============================================================================
-- Verify migration 225 (security hardening) — run in Supabase SQL editor.
-- Read-only. Each query states its EXPECTED result.
-- ============================================================================

-- 1. Did 225 apply?  EXPECT: migration_225_applied = true
select exists (
  select 1 from public.schema_migrations where version = 225
) as migration_225_applied;

-- 2. Bucket privacy.  EXPECT: driver-documents = false (private);
--    avatars = true, oo-logos = true (intentionally public)
select id, public
from storage.buckets
where id in ('driver-documents','avatars','oo-logos')
order by id;

-- 3. is_super_admin no longer anon-executable.  EXPECT: false
select has_function_privilege('anon', 'public.is_super_admin(uuid)', 'EXECUTE')
  as anon_can_execute_is_super_admin;

-- 4. Client-reachable wide-open policies on the 7 named tables.  EXPECT: 0
--    (includes SELECT; filters to client roles only — service_role true = fine)
select count(*) as client_permissive_count
from pg_policies
where schemaname = 'public'
  and tablename = any (array[
    'fleets','parts','rate_contracts','saved_reports',
    'title_transfers','scale_tickets','activation_payments'
  ])
  and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')
  and roles && array['anon','authenticated','public']::name[];

-- 5. CUTOVER-SAFETY: ANY public table still client-reachable + wide-open.
--    EXPECT: zero rows. Any row = a table to add to a 226 follow-up before flip.
select tablename, count(*) as client_permissive
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')
  and roles && array['anon','authenticated','public']::name[]
group by tablename
order by client_permissive desc;
