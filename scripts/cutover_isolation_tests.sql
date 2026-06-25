-- ============================================================================
-- Multi-tenant cutover — isolation & data-stamp verification
-- Companion to RUNBOOK_AUTH_CUTOVER.md. Run in the Supabase SQL editor BEFORE
-- flipping RONYX_AUTH_REQUIRED=true. Every check has an explicit "expected".
-- Read-only (SELECTs only) — safe to run anytime.
-- ============================================================================

-- ── 0. Org inventory ────────────────────────────────────────────────────────
-- Expect: each real tenant present, status active, a slug + code.
select id, name, organization_slug, organization_code, status, created_at
from public.organizations
order by created_at;

-- ── 1. Every active user maps to an org ─────────────────────────────────────
-- Expect: 0. A null org means that user resolves to nothing once the flag flips.
select count(*) as users_without_org
from public.profiles
where organization_id is null;

-- Per-org user counts (sanity: each tenant has its own users).
select organization_id, count(*) as users
from public.profiles
group by organization_id
order by users desc;

-- ── 2. Owner-operator rows are org-stamped ──────────────────────────────────
-- Expect: 0. Unstamped OO rows get hidden by the cutover org filter.
select count(*) as oos_without_org
from public.ronyx_owner_operators
where organization_id is null;

select organization_id, count(*) as owner_operators
from public.ronyx_owner_operators
group by organization_id
order by owner_operators desc;

-- ── 3. SWEEP: every table with an organization_id column, find unstamped rows ─
-- This META-query GENERATES one null-check SELECT per tenant-scoped table.
-- Run it, then copy/paste/execute the generated block. Any non-zero result =
-- data that a tenant would lose (or that would leak) at cutover — fix before flip.
select string_agg(
  format(
    'select %L as tbl, count(*) as null_org_rows from public.%I where organization_id is null',
    table_name, table_name
  ),
  E'\nunion all\n'
  order by table_name
) || E'\norder by null_org_rows desc;'
from information_schema.columns
where table_schema = 'public'
  and column_name = 'organization_id';

-- ── 4. A/B isolation spot-check (fill in two real org UUIDs) ─────────────────
-- After creating the 2nd tenant, set these and confirm each tenant's row counts
-- are disjoint and non-overlapping across the core tables.
-- \set ORG_A '00000000-0000-0000-0000-000000000000'
-- \set ORG_B '11111111-1111-1111-1111-111111111111'
--
-- Example (repeat per core table): expect rows only under the owning org.
-- select organization_id, count(*) from public.fast_scan_documents
--   where organization_id in (:'ORG_A', :'ORG_B') group by organization_id;

-- ── 5. Storage key isolation (objects must be prefixed with the org UUID) ────
-- First path segment is the tenant (RLS: organization_id::text = foldername[1]).
-- Expect: 0 objects whose first segment isn't a known org id.
select count(*) as objects_with_bad_org_prefix
from storage.objects
where bucket_id = 'tms-documents'
  and split_part(name, '/', 1) not in (select id::text from public.organizations);

-- ── 6. Webhook tenant mapping (carrier -> OO -> org) ────────────────────────
-- Spot-check: a given mc/dot resolves to exactly one org. Expect <= 1 row each.
-- select mc_number, count(distinct organization_id) as orgs
-- from public.ronyx_owner_operators
-- where mc_number is not null group by mc_number having count(distinct organization_id) > 1;
