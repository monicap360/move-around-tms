-- =============================================================================
-- MOVEAROUND TMS — Database Health Check
-- Run in Supabase SQL Editor (as postgres / service_role).
-- Read-only: no data is inserted, updated, or deleted.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLE EXISTENCE + RLS STATUS
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '1. Tables & RLS' AS section,
  c.relname                                          AS table_name,
  CASE WHEN c.relrowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END AS rls_status,
  CASE WHEN c.relforcerowsecurity THEN 'force ON' ELSE 'force OFF' END AS force_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'aggregate_tickets',
    'projects',
    'equipment',
    'payroll_items',
    'invoice_reconciliation',
    'drivers',
    'tickets',
    'loads',
    'fast_scan_uploads',
    'organizations',
    'user_seats',
    'ticket_audit_log',
    'ronyx_owner_operators'
  )
ORDER BY c.relname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS POLICIES ON THE FOUR NEW TABLES
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '2. RLS Policies' AS section,
  tablename,
  policyname,
  cmd        AS operation,
  roles      AS applies_to,
  CASE WHEN qual IS NOT NULL THEN '✅' ELSE '—' END AS has_using,
  CASE WHEN with_check IS NOT NULL THEN '✅' ELSE '—' END AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('projects','equipment','payroll_items','invoice_reconciliation')
ORDER BY tablename, cmd;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. organization_id COLUMN PRESENCE ON KEY TABLES
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '3. organization_id column' AS section,
  t.table_name,
  CASE WHEN c.column_name IS NOT NULL
       THEN '✅ present (type: ' || c.data_type || ', default: ' || coalesce(c.column_default, 'none') || ')'
       ELSE '❌ MISSING'
  END AS org_id_status
FROM (
  VALUES
    ('aggregate_tickets'),
    ('projects'),
    ('equipment'),
    ('payroll_items'),
    ('invoice_reconciliation'),
    ('drivers'),
    ('loads'),
    ('ronyx_owner_operators')
) AS t(table_name)
LEFT JOIN information_schema.columns c
  ON  c.table_schema = 'public'
  AND c.table_name   = t.table_name
  AND c.column_name  = 'organization_id'
ORDER BY t.table_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AGGREGATE_TICKETS — KEY COLUMNS FROM MIGRATIONS 103–105
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '4. aggregate_tickets columns' AS section,
  col                            AS expected_column,
  CASE WHEN c.column_name IS NOT NULL THEN '✅ present' ELSE '❌ MISSING' END AS status
FROM (
  VALUES
    ('ticket_number'), ('ticket_date'), ('driver_name'), ('truck_number'),
    ('status'), ('payment_status'), ('material'), ('quantity'), ('pay_rate'), ('bill_rate'),
    ('voided'), ('voided_at'), ('voided_by'), ('void_reason'),
    ('ticket_id'), ('source'), ('has_photo'), ('has_signature'),
    ('validation_status'), ('validation_score'), ('validation_errors'),
    ('crosscheck_status'), ('weight_variance_pct'),
    ('payroll_hold'), ('billing_hold'),
    ('total_amount'), ('updated_at')
) AS expected(col)
LEFT JOIN information_schema.columns c
  ON  c.table_schema = 'public'
  AND c.table_name   = 'aggregate_tickets'
  AND c.column_name  = expected.col
ORDER BY col;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FUNCTIONS — current_user_org, is_admin, set_aggregate_tickets_updated_at
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '5. Functions' AS section,
  fn             AS function_name,
  CASE WHEN p.proname IS NOT NULL
       THEN '✅ exists (security: ' ||
            CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END || ')'
       ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES
    ('current_user_org'),
    ('is_admin'),
    ('set_aggregate_tickets_updated_at')
) AS expected(fn)
LEFT JOIN pg_proc p
  ON  p.proname = expected.fn
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY fn;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. KEY INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '6. Indexes' AS section,
  idx           AS expected_index,
  CASE WHEN i.indexname IS NOT NULL THEN '✅ exists' ELSE '❌ MISSING' END AS status
FROM (
  VALUES
    ('idx_projects_org_id'),
    ('idx_equipment_org_id'),
    ('idx_payroll_items_org_id'),
    ('idx_invoice_recon_org_id'),
    ('idx_user_seats_uid_org_106'),
    ('idx_aggregate_tickets_ticket_id'),
    ('idx_aggregate_tickets_source'),
    ('idx_aggregate_tickets_voided'),
    ('idx_aggregate_tickets_voided_by'),
    ('idx_ticket_audit_ticket')
) AS expected(idx)
LEFT JOIN pg_indexes i
  ON  i.schemaname = 'public'
  AND i.indexname  = expected.idx
ORDER BY idx;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TICKET COUNT + RECENT RECORD SAMPLE
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '7. Ticket queue depth' AS section,
  count(*)                AS total_tickets,
  count(*) FILTER (WHERE voided = true)              AS deleted,
  count(*) FILTER (WHERE voided IS NOT TRUE)         AS active,
  count(*) FILTER (WHERE status = 'pending')         AS pending,
  count(*) FILTER (WHERE status = 'approved')        AS approved,
  max(created_at)                                    AS latest_created
FROM public.aggregate_tickets;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET — ticket-uploads exists?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '8. Storage buckets' AS section,
  name                 AS bucket,
  public               AS is_public,
  file_size_limit,
  created_at
FROM storage.buckets
ORDER BY name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ORGANIZATIONS + USER_SEATS — are they populated?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT '9a. Organizations' AS section, count(*) AS total_orgs FROM public.organizations;

SELECT '9b. User seats'    AS section, count(*) AS total_seats,
       count(DISTINCT organization_id) AS orgs_with_seats,
       count(DISTINCT user_id)         AS unique_users
FROM public.user_seats;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. TICKET AUDIT LOG — any entries?
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  '10. Audit log' AS section,
  count(*)        AS total_entries,
  count(*) FILTER (WHERE action = 'deleted') AS deletion_events,
  max(created_at)                            AS latest_entry
FROM public.ticket_audit_log;
