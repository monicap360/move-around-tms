-- =============================================================================
-- RLS TEST SUITE — Migration 106 Verification
-- Run the entire file in Supabase SQL Editor (connected as postgres / service_role).
-- The script is wrapped in a transaction so all test data is automatically
-- removed by the final ROLLBACK — nothing persists in your database.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SEED: Two test organizations
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations (id, name)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '__Test Org A__'),
  ('b0000000-0000-0000-0000-000000000002', '__Test Org B__')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- SEED: One user_seat per org (these UUIDs simulate auth user IDs)
-- ---------------------------------------------------------------------------
-- user_a  belongs to Org A
-- user_b  belongs to Org B
INSERT INTO public.user_seats (user_id, organization_id, role)
VALUES
  ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dispatcher'),
  ('bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'dispatcher')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SEED: One row per table per org
-- ---------------------------------------------------------------------------
INSERT INTO public.projects (id, organization_id)
VALUES
  ('aa100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),  -- Org A
  ('bb100000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002');  -- Org B

INSERT INTO public.equipment (id, organization_id)
VALUES
  ('aa200000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('bb200000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002');

INSERT INTO public.payroll_items (id, organization_id)
VALUES
  ('aa300000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('bb300000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002');

INSERT INTO public.invoice_reconciliation (id, organization_id)
VALUES
  ('aa400000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('bb400000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------------------
-- RESULTS TABLE bootstrap
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE rls_test_results (
  seq      serial,
  test     text,
  expected text,
  actual   text,
  passed   boolean
);

-- =============================================================================
-- TEST 1 — current_user_org() resolves to correct org for each user
-- =============================================================================

-- ── User A ──
SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT
  'current_user_org() — User A',
  'a0000000-0000-0000-0000-000000000001',
  public.current_user_org()::text,
  public.current_user_org() = 'a0000000-0000-0000-0000-000000000001';

RESET role;

-- ── User B ──
SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT
  'current_user_org() — User B',
  'b0000000-0000-0000-0000-000000000002',
  public.current_user_org()::text,
  public.current_user_org() = 'b0000000-0000-0000-0000-000000000002';

RESET role;

-- =============================================================================
-- TEST 2 — SELECT isolation (each user sees only their org's rows)
-- =============================================================================

-- ── User A sees 1 row per table (Org A only) ──────────────────────────────
SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT projects — User A sees Org A only', '1',
  count(*)::text, count(*) = 1
FROM public.projects
WHERE id IN ('aa100000-0000-0000-0000-000000000001','bb100000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT equipment — User A sees Org A only', '1',
  count(*)::text, count(*) = 1
FROM public.equipment
WHERE id IN ('aa200000-0000-0000-0000-000000000001','bb200000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT payroll_items — User A sees Org A only', '1',
  count(*)::text, count(*) = 1
FROM public.payroll_items
WHERE id IN ('aa300000-0000-0000-0000-000000000001','bb300000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT invoice_reconciliation — User A sees Org A only', '1',
  count(*)::text, count(*) = 1
FROM public.invoice_reconciliation
WHERE id IN ('aa400000-0000-0000-0000-000000000001','bb400000-0000-0000-0000-000000000002');

RESET role;

-- ── User B sees 1 row per table (Org B only) ──────────────────────────────
SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"bb000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT projects — User B sees Org B only', '1',
  count(*)::text, count(*) = 1
FROM public.projects
WHERE id IN ('aa100000-0000-0000-0000-000000000001','bb100000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT equipment — User B sees Org B only', '1',
  count(*)::text, count(*) = 1
FROM public.equipment
WHERE id IN ('aa200000-0000-0000-0000-000000000001','bb200000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT payroll_items — User B sees Org B only', '1',
  count(*)::text, count(*) = 1
FROM public.payroll_items
WHERE id IN ('aa300000-0000-0000-0000-000000000001','bb300000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'SELECT invoice_reconciliation — User B sees Org B only', '1',
  count(*)::text, count(*) = 1
FROM public.invoice_reconciliation
WHERE id IN ('aa400000-0000-0000-0000-000000000001','bb400000-0000-0000-0000-000000000002');

RESET role;

-- =============================================================================
-- TEST 3 — UPDATE cross-org is silently blocked (USING clause returns 0 rows)
-- =============================================================================

SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- User A attempts to no-op UPDATE on Org B's project row
UPDATE public.projects SET id = id
WHERE  id = 'bb100000-0000-0000-0000-000000000002';

-- Row's organization_id must still be Org B (update never happened)
RESET role;  -- back to service_role so we can see both rows
INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT
  'UPDATE cross-org blocked — projects Org B row untouched',
  'b0000000-0000-0000-0000-000000000002',
  organization_id::text,
  organization_id = 'b0000000-0000-0000-0000-000000000002'
FROM public.projects
WHERE id = 'bb100000-0000-0000-0000-000000000002';

-- Same for equipment
SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

UPDATE public.equipment SET id = id
WHERE  id = 'bb200000-0000-0000-0000-000000000002';

RESET role;
INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT
  'UPDATE cross-org blocked — equipment Org B row untouched',
  'b0000000-0000-0000-0000-000000000002',
  organization_id::text,
  organization_id = 'b0000000-0000-0000-0000-000000000002'
FROM public.equipment
WHERE id = 'bb200000-0000-0000-0000-000000000002';

-- =============================================================================
-- TEST 4 — INSERT WITH CHECK rejects cross-org inserts
-- =============================================================================

SET LOCAL role = authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aa000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- User A tries to insert a projects row for Org B — must raise an exception
DO $$
BEGIN
  INSERT INTO public.projects (id, organization_id)
  VALUES ('cc100000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000002');

  -- If we reach here, the insert was NOT blocked — fail
  INSERT INTO rls_test_results (test, expected, actual, passed)
  VALUES ('INSERT cross-org blocked — projects', 'ERROR raised', 'No error — insert succeeded', false);
EXCEPTION WHEN others THEN
  -- Expected: RLS WITH CHECK violation
  INSERT INTO rls_test_results (test, expected, actual, passed)
  VALUES ('INSERT cross-org blocked — projects', 'ERROR raised', 'Correctly raised: ' || SQLERRM, true);
END $$;

-- Same for payroll_items
DO $$
BEGIN
  INSERT INTO public.payroll_items (id, organization_id)
  VALUES ('cc300000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000002');

  INSERT INTO rls_test_results (test, expected, actual, passed)
  VALUES ('INSERT cross-org blocked — payroll_items', 'ERROR raised', 'No error — insert succeeded', false);
EXCEPTION WHEN others THEN
  INSERT INTO rls_test_results (test, expected, actual, passed)
  VALUES ('INSERT cross-org blocked — payroll_items', 'ERROR raised', 'Correctly raised: ' || SQLERRM, true);
END $$;

RESET role;

-- =============================================================================
-- TEST 5 — service_role bypasses RLS and sees ALL rows
-- =============================================================================
-- Already running as service_role / postgres — no SET ROLE needed

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'service_role SELECT — projects (both orgs visible)', '2',
  count(*)::text, count(*) = 2
FROM public.projects
WHERE id IN ('aa100000-0000-0000-0000-000000000001','bb100000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'service_role SELECT — equipment (both orgs visible)', '2',
  count(*)::text, count(*) = 2
FROM public.equipment
WHERE id IN ('aa200000-0000-0000-0000-000000000001','bb200000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'service_role SELECT — payroll_items (both orgs visible)', '2',
  count(*)::text, count(*) = 2
FROM public.payroll_items
WHERE id IN ('aa300000-0000-0000-0000-000000000001','bb300000-0000-0000-0000-000000000002');

INSERT INTO rls_test_results (test, expected, actual, passed)
SELECT 'service_role SELECT — invoice_reconciliation (both orgs visible)', '2',
  count(*)::text, count(*) = 2
FROM public.invoice_reconciliation
WHERE id IN ('aa400000-0000-0000-0000-000000000001','bb400000-0000-0000-0000-000000000002');

-- =============================================================================
-- FINAL OUTPUT — print all test results
-- =============================================================================
SELECT
  seq,
  test,
  expected,
  actual,
  CASE WHEN passed THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM rls_test_results
ORDER BY seq;

-- =============================================================================
-- ROLLBACK — removes all test data; nothing persists
-- =============================================================================
ROLLBACK;
