-- RLS CI / release gate — returns ONLY violations. Empty result = PASS.
-- Run e.g.:  psql "$DATABASE_URL" -tAf db/checks/rls_ci_gate.sql
-- In CI, fail the job if this query returns any rows.
--
-- Two violation classes:
--   1. rls_disabled_in_public  — any public TABLE with RLS off (high risk; always fail).
--   2. rls_enabled_no_policy    — RLS on + zero policies AND not documented as
--      intentionally service-role-only.
--
-- The allowlist below MUST stay in sync with SECURITY.md (intentionally-locked
-- tables). When you legitimately lock a new service-role-only table, add it to
-- BOTH this list and SECURITY.md. Never add it just to silence the gate.

with allowlist(table_name) as (values
  ('schema_migrations'),
  ('document_access_log'),
  ('document_provenance'),
  ('deleted_drivers_archive'),
  ('compliance_overrides'),
  ('customer_dispatch_requirements'),
  ('customer_requirement_checks'),
  ('dispatch_import_rows'),
  ('dispatch_rmis_note_rules'),
  ('module_registry'),
  ('ronyx_ticket_ocr_extractions'),
  ('referrals')
),
pub as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'   -- ordinary tables only (views excluded)
),
pol as (
  select tablename as table_name, count(*)::int as policy_count
  from pg_policies where schemaname = 'public'
  group by tablename
)
select
  p.table_name,
  case
    when not p.rls_enabled then 'VIOLATION: rls_disabled_in_public'
    else 'VIOLATION: rls_enabled_no_policy (not in SECURITY.md allowlist)'
  end as violation
from pub p
left join pol pc on pc.table_name = p.table_name
where
  (not p.rls_enabled)
  or (
    p.rls_enabled
    and coalesce(pc.policy_count, 0) = 0
    and p.table_name not in (select table_name from allowlist)
  )
order by p.rls_enabled, p.table_name;
