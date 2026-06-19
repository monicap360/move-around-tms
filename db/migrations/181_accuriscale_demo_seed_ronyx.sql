-- ============================================================
-- Migration 181: AccuriScale Intelligence™ — Ronyx Starter Seed
--
-- Seeds sample loads, tickets, exceptions, rules, tolerance
-- settings, and ROI settings for Ronyx testing.
-- Safe to re-run (ON CONFLICT DO NOTHING / DO UPDATE).
-- Requires migrations 178, 179, 180 first.
-- ============================================================

DO $$
DECLARE
  v_org_id    uuid;
  v_load1_id  uuid := gen_random_uuid();
  v_load2_id  uuid := gen_random_uuid();
  v_load3_id  uuid := gen_random_uuid();
  v_load4_id  uuid := gen_random_uuid();
  v_load5_id  uuid := gen_random_uuid();
  v_tkt1_id   uuid := gen_random_uuid();
  v_tkt2_id   uuid := gen_random_uuid();
  v_tkt3_id   uuid := gen_random_uuid();
  v_tkt4_id   uuid := gen_random_uuid();
BEGIN

  -- Resolve Ronyx org
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE lower(name) LIKE '%ronyx%'
     OR lower(organization_code) LIKE '%ronyx%'
     OR id = '00000000-0000-0000-0000-000000000001'
  ORDER BY
    CASE WHEN lower(name) LIKE '%ronyx%' OR lower(organization_code) LIKE '%ronyx%' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Ronyx org not found — skipping AccuriScale seed.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding AccuriScale for org: %', v_org_id;


  -- ─── Tolerance Settings ──────────────────────────────────────────────
  INSERT INTO public.accuriscale_tolerance_settings (
    organization_id, weight_variance_percent, weight_variance_tons,
    allow_manual_override, require_override_reason, duplicate_ticket_window_days,
    auto_match_confidence_min, short_load_threshold_percent
  )
  VALUES (v_org_id, 3.0, 1.0, true, true, 30, 80, 90.0)
  ON CONFLICT (organization_id) DO NOTHING;


  -- ─── ROI Settings ────────────────────────────────────────────────────
  INSERT INTO public.accuriscale_roi_settings (
    organization_id, loads_per_day, average_value_per_load,
    discrepancy_percent, reconciliation_hours_per_day, admin_hourly_rate,
    missed_accessorial_percent, working_days_per_year
  )
  VALUES (v_org_id, 45, 420.00, 4.0, 2.0, 30.00, 2.0, 260)
  ON CONFLICT (organization_id) DO NOTHING;


  -- ─── Sample Loads ────────────────────────────────────────────────────
  INSERT INTO public.accuriscale_loads (
    id, organization_id, material, load_date,
    load_status, expected_tons, actual_tons,
    customer_rate, driver_pay_rate,
    billing_status, payroll_status
  ) VALUES
    -- Load 1: Clean load, ready to bill and pay
    (v_load1_id, v_org_id, 'Crushed Limestone 1.5"', CURRENT_DATE - 1,
     'delivered', 22.5, 22.1,
     18.50, 9.00,
     'ready_to_bill', 'ready_for_payroll'),

    -- Load 2: Short load — below 90% threshold
    (v_load2_id, v_org_id, 'Crushed Limestone 1.5"', CURRENT_DATE - 1,
     'delivered', 22.5, 10.27,
     18.50, 9.00,
     'billing_hold', 'payroll_hold'),

    -- Load 3: Missing ticket
    (v_load3_id, v_org_id, 'Sand Fill', CURRENT_DATE,
     'delivered', 18.0, NULL,
     22.00, 10.50,
     'billing_hold', 'payroll_hold'),

    -- Load 4: Rate mismatch
    (v_load4_id, v_org_id, 'Gravel 3/4"', CURRENT_DATE - 2,
     'delivered', 20.0, 19.8,
     19.50, 9.25,
     'billing_hold', 'ready_for_payroll'),

    -- Load 5: Clean load
    (v_load5_id, v_org_id, 'Concrete Sand', CURRENT_DATE - 2,
     'delivered', 21.0, 20.9,
     17.75, 8.50,
     'ready_to_bill', 'ready_for_payroll')
  ON CONFLICT (id) DO NOTHING;


  -- ─── Sample Scale Tickets ─────────────────────────────────────────────
  INSERT INTO public.accuriscale_scale_tickets (
    id, organization_id,
    ticket_number, ticket_date, pit_name, vendor_name,
    truck_number, driver_name, material,
    gross_weight, tare_weight, net_weight, tons,
    ocr_status, ocr_confidence, source_type
  ) VALUES
    -- Ticket 1: Matches Load 1 (clean)
    (v_tkt1_id, v_org_id,
     'TKT-009201', CURRENT_DATE - 1, 'Katy Pit — Bay 3', 'Martin Marietta',
     'TRK-18', 'Carlos M.', 'Crushed Limestone 1.5"',
     47200, 26800, 20400, 10.2,
     'complete', 94.5, 'ocr_upload'),

    -- Ticket 2: Short load — links to Load 2
    (v_tkt2_id, v_org_id,
     'TKT-009202', CURRENT_DATE - 1, 'Katy Pit — Bay 3', 'Martin Marietta',
     'TRK-18', 'Carlos M.', 'Crushed Limestone 1.5"',
     47200, 26600, 20600, 10.3,
     'complete', 91.2, 'ocr_upload'),

    -- Ticket 3: Duplicate of TKT-009201
    (v_tkt3_id, v_org_id,
     'TKT-009201', CURRENT_DATE, 'Katy Pit — Bay 3', 'Martin Marietta',
     'TRK-18', 'Carlos M.', 'Crushed Limestone 1.5"',
     47200, 26800, 20400, 10.2,
     'complete', 93.0, 'ocr_upload'),

    -- Ticket 4: Rate mismatch scenario
    (v_tkt4_id, v_org_id,
     'TKT-009205', CURRENT_DATE - 2, 'West Houston Pit', 'Vulcan Materials',
     'TRK-12', 'James R.', 'Gravel 3/4"',
     44800, 26200, 18600, 9.3,
     'complete', 88.0, 'ocr_upload')
  ON CONFLICT (id) DO NOTHING;


  -- ─── Sample Exceptions (Review Queue) ────────────────────────────────
  INSERT INTO public.accuriscale_exceptions (
    organization_id, exception_type, severity, status,
    load_id, scale_ticket_id,
    issue_title, issue_description,
    assigned_role, action_label
  ) VALUES
    -- Short load on Load 2
    (v_org_id, 'short_load', 'critical', 'open',
     v_load2_id, v_tkt2_id,
     'Short Load — TKT-009202',
     'Expected 22.5 tons · Scale captured 10.3 tons · 54% of expected. Payroll and billing on hold pending review.',
     'office', 'Review Short Load'),

    -- Missing ticket on Load 3
    (v_org_id, 'missing_ticket', 'critical', 'open',
     v_load3_id, NULL,
     'Missing Ticket Proof — Sand Fill · ' || CURRENT_DATE::text,
     'Load delivered but no scale ticket uploaded or matched. Cannot release to payroll or billing without proof.',
     'office', 'Upload Ticket'),

    -- Duplicate ticket
    (v_org_id, 'duplicate_ticket', 'critical', 'open',
     NULL, v_tkt3_id,
     'Duplicate Ticket — TKT-009201 Submitted Twice',
     'Ticket number TKT-009201 was submitted on two separate dates. One submission must be voided before processing.',
     'office', 'Void Duplicate'),

    -- Rate mismatch on Load 4
    (v_org_id, 'rate_mismatch', 'critical', 'open',
     v_load4_id, v_tkt4_id,
     'Rate Mismatch — Load 4 · Gravel 3/4"',
     'Load was dispatched at $19.50/ton. Contracted customer rate on file is $18.50/ton. Billing on hold.',
     'office', 'Confirm Rate'),

    -- Payroll hold notification
    (v_org_id, 'payroll_hold', 'warning', 'open',
     v_load2_id, NULL,
     'Payroll Hold — 2 Loads Pending Exception Resolution',
     'Load TKT-009202 (short load) and Load 3 (missing ticket) cannot be released to payroll until exceptions are resolved.',
     'office', 'View Exceptions')
  ON CONFLICT DO NOTHING;


  -- ─── Org-Level Rules (override global defaults if needed) ───────────
  INSERT INTO public.accuriscale_rules (
    organization_id, rule_key, rule_name, rule_description,
    exception_type, severity, auto_hold_payroll, auto_hold_billing
  ) VALUES
    (v_org_id, 'rule_short_load', 'Short Load — Ronyx (90% threshold)',
     'Flag loads below 90% of expected tons. Hold payroll and billing until reviewed.',
     'short_load', 'critical', true, true),
    (v_org_id, 'rule_duplicate_ticket', 'Duplicate Ticket — Ronyx (30-day window)',
     'Flag duplicate ticket numbers within 30 days. Both payroll and billing halted.',
     'duplicate_ticket', 'critical', true, true)
  ON CONFLICT (organization_id, rule_key) DO UPDATE SET
    is_active  = true,
    updated_at = now();


  RAISE NOTICE 'AccuriScale starter data seeded for Ronyx org: %', v_org_id;
  RAISE NOTICE '  Loads: 5 · Scale tickets: 4 · Exceptions: 5';

END $$;


-- ─── Validate ────────────────────────────────────────────────────────────────

SELECT 'accuriscale_loads'       AS table_name, COUNT(*) AS rows FROM public.accuriscale_loads
UNION ALL
SELECT 'accuriscale_scale_tickets', COUNT(*) FROM public.accuriscale_scale_tickets
UNION ALL
SELECT 'accuriscale_exceptions',    COUNT(*) FROM public.accuriscale_exceptions
UNION ALL
SELECT 'accuriscale_rules (global)', COUNT(*) FROM public.accuriscale_rules WHERE organization_id IS NULL
ORDER BY table_name;
