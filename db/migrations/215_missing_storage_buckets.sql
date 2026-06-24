-- Migration 215: Create 4 storage buckets that app code references via
-- supabase.storage.from(...) but which are missing from the live environment
-- (confirmed by a separator-sensitive expected−actual bucket diff, 2026-06-24).
--
-- Findings behind this migration:
--   hr_docs          — declared in 187 but never created in this env (re-assert).
--   contracts        — referenced in code, NEVER declared in any migration.
--   org_excel_files  — referenced in code, NEVER declared in any migration.
--   paystubs         — referenced in code, NEVER declared in any migration.
--
-- All 4 hold sensitive HR/financial documents → private (public = false).
-- Idempotent: ON CONFLICT (id) DO NOTHING + CREATE POLICY IF NOT EXISTS.
-- Run in the Supabase SQL Editor (same as 187/204).

-- ── 1. Buckets (id, name, public, file_size_limit bytes) ─────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values
  -- HR documents (driver applications, onboarding, SMS-uploaded docs) — code: app/api/webhooks/sms/route.ts etc.
  ('hr_docs',         'hr_docs',         false, 31457280),   -- 30 MB
  -- Signed/served contracts — code: app/supabase/functions/hr-payroll/index.ts
  ('contracts',       'contracts',       false, 31457280),   -- 30 MB
  -- Org Excel/spreadsheet imports & exports — code: app/api/ronyx/excel/route.ts
  ('org_excel_files', 'org_excel_files', false, 52428800),   -- 50 MB (workbooks run large)
  -- Generated paystubs — code: app/supabase/functions/hr-payroll/index.ts
  ('paystubs',        'paystubs',        false, 31457280)    -- 30 MB
on conflict (id) do nothing;

-- ── 2. Access policies on storage.objects ───────────────────────────────────
-- These buckets are written/read mainly by server routes & edge functions using
-- the service role (which bypasses RLS). The authenticated policy below covers
-- any client-side calls and matches the convention in migration 204.
-- (Postgres has no CREATE POLICY IF NOT EXISTS; drop-then-create is idempotent.)
drop policy if exists "hr_docs_auth" on storage.objects;
create policy "hr_docs_auth" on storage.objects
  for all using (bucket_id = 'hr_docs' and auth.role() = 'authenticated')
  with check (bucket_id = 'hr_docs' and auth.role() = 'authenticated');

drop policy if exists "contracts_auth" on storage.objects;
create policy "contracts_auth" on storage.objects
  for all using (bucket_id = 'contracts' and auth.role() = 'authenticated')
  with check (bucket_id = 'contracts' and auth.role() = 'authenticated');

drop policy if exists "org_excel_files_auth" on storage.objects;
create policy "org_excel_files_auth" on storage.objects
  for all using (bucket_id = 'org_excel_files' and auth.role() = 'authenticated')
  with check (bucket_id = 'org_excel_files' and auth.role() = 'authenticated');

drop policy if exists "paystubs_auth" on storage.objects;
create policy "paystubs_auth" on storage.objects
  for all using (bucket_id = 'paystubs' and auth.role() = 'authenticated')
  with check (bucket_id = 'paystubs' and auth.role() = 'authenticated');

-- ── 3. Explicit service-role policies (matches migration 187 convention) ─────
do $$
declare
  b text;
begin
  foreach b in array array['hr_docs', 'contracts', 'org_excel_files', 'paystubs']
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = b || ' service role full access'
    ) then
      execute format(
        'create policy %I on storage.objects for all to service_role
         using (bucket_id = %L) with check (bucket_id = %L)',
        b || ' service role full access', b, b
      );
    end if;
  end loop;
end $$;
