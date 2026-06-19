-- ============================================================
-- Migration 171: Ronyx Real Trial Setup
-- File: db/migrations/171_ronyx_real_trial_setup.sql
-- Purpose:
--   Set Ronyx up as a real free-trial organization (not demo access).
--   demoMode=false, RONYX_AUTH_REQUIRED=true, real Supabase auth users.
--
-- Targeting:
--   All writes target Ronyx by name/organization_code pattern.
--   The UUID '00000000-0000-0000-0000-000000000001' is an additional OR
--   condition only — not the sole target. If the UUID is wrong, the name/code
--   match will still catch the correct row.
--
-- Order of operations:
--   1. Set 30-day free trial on the Ronyx org
--   2. Seed all trial modules using a subquery for the org ID
--   3. Validation queries
-- ============================================================


-- ------------------------------------------------------------
-- 1. Activate 30-day free trial on the Ronyx organization
--    Targets by name pattern AND/OR organization_code AND/OR UUID.
--    All three are OR conditions — only one needs to match.
-- ------------------------------------------------------------

UPDATE public.organizations
SET
  status                = 'active',
  account_type          = 'free_trial',
  subscription_status   = 'trial_active',
  bypass_subscription   = true,
  subscription_required = false,
  pilot_started_at      = now(),
  pilot_ends_at         = now() + interval '30 days',
  pilot_notes           = 'Ronyx 30-day free trial. Real account setup. demoMode=false, RONYX_AUTH_REQUIRED=true. Migration 171.'
WHERE lower(name) LIKE '%ronyx%'
   OR lower(organization_code) LIKE '%ronyx%'
   OR id = '00000000-0000-0000-0000-000000000001';


-- ------------------------------------------------------------
-- 2. Seed all trial modules for Ronyx
--    organization_id is resolved via subquery — not hardcoded.
--    ON CONFLICT refreshes existing rows.
-- ------------------------------------------------------------

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Resolve org ID by name/code (UUID is a fallback OR, not the primary key)
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE lower(name) LIKE '%ronyx%'
     OR lower(organization_code) LIKE '%ronyx%'
     OR id = '00000000-0000-0000-0000-000000000001'
  ORDER BY
    -- Prefer name/code match over UUID-only match
    CASE
      WHEN lower(name) LIKE '%ronyx%' OR lower(organization_code) LIKE '%ronyx%' THEN 0
      ELSE 1
    END
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Ronyx organization not found. Check organizations table for name/code.';
  END IF;

  RAISE NOTICE 'Seeding modules for org_id: %', v_org_id;

  INSERT INTO public.organization_modules (
    organization_id, module_key, module_name, module_subtitle,
    category, status, description, features,
    price_monthly, price_label, included_in_plan,
    trial_started_at, trial_ends_at, activated_at
  )
  VALUES
    (
      v_org_id, 'owner_operator_hub', 'Owner Operator Hub', 'Operations',
      'Operations', 'in_trial',
      'Manage owner operators, sub-haulers, contracts, insurance, drivers, trucks, documents, compliance, dispatch eligibility, and settlements.',
      ARRAY[
        'Owner operator profiles', 'Sub-hauler management', 'Contract tracking',
        'Auto Liability COI tracking', 'General Liability COI tracking',
        'Cargo COI tracking', 'Driver and truck assignment', 'Settlement readiness',
        'Dispatch eligibility', 'Compliance holds'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'fast_scan', 'Fast Scan', 'Tickets',
      'Tickets', 'in_trial',
      'AI-powered ticket scanning: upload paper tickets, extract fields, match to dispatch, push to payroll and billing.',
      ARRAY[
        'AI OCR ticket scanning', 'Ticket field extraction', 'Dispatch-to-ticket match',
        'Ticket → Payroll pipeline', 'Ticket → Billing pipeline', 'Audit trail per ticket'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'dispatch_guard', 'Dispatch Guard™', 'Dispatch',
      'Dispatch', 'in_trial',
      'Daily dispatch CSV import, RMIS compliance classification, dispatch-to-ticket matching, and dispatch-to-pay payroll validation.',
      ARRAY[
        'Dispatch CSV import', 'RMIS compliance note classification',
        'Dispatch-to-ticket matching', 'Dispatch-to-pay payroll validation',
        'Dispatch hold detection', 'Compliance alert routing'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'payroll_settlements', 'Payroll Review', 'Payroll',
      'Payroll', 'in_trial',
      'Review, approve, and finalize driver and owner operator settlements from ticket data.',
      ARRAY[
        'Driver payroll review and approval', 'Owner operator settlement processing',
        'Payroll hold and deduction management', 'Settlement packet generation',
        'Payroll audit log', 'W2 and 1099 driver support'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'billing_invoicing', 'Billing Ready Queue', 'Billing',
      'Billing', 'in_trial',
      'Generate customer invoices from verified tickets and manage billing queue.',
      ARRAY[
        'Customer invoice generation from tickets', 'Billing queue and approval workflow',
        'Rate sheets per customer', 'Invoice batch export',
        'Accounts receivable tracking', 'Dispute and exception management'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'driver_management', 'Driver Management', 'Fleet',
      'Fleet', 'in_trial',
      'Full driver profiles, compliance tracking, pay rates, and document management.',
      ARRAY[
        'Driver profiles and status', 'CDL and compliance document tracking',
        'Pay rate management', 'Driver audit log', 'Compliance expiration alerts'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'maintenance_hub', 'Maintenance Hub', 'Fleet',
      'Fleet', 'in_trial',
      'Track truck inspections, repairs, and maintenance schedules. Control dispatch eligibility by maintenance status.',
      ARRAY[
        'Truck maintenance records', 'Inspection logs', 'Repair ticket tracking',
        'Maintenance schedule and reminders', 'Dispatch eligibility by maintenance status',
        'Fleet health dashboard'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    ),
    (
      v_org_id, 'reporting_analytics', 'Reports & Analytics', 'Reports',
      'Reports', 'in_trial',
      'Fleet performance dashboards, ticket analytics, payroll summaries, and custom reports.',
      ARRAY[
        'Ticket volume and revenue reports', 'Driver performance dashboard',
        'Payroll summary reports', 'Fleet utilization analytics',
        'Export to Excel/PDF'
      ],
      0, 'Included in Trial',
      ARRAY['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
      now(), now() + interval '30 days', now()
    )
  ON CONFLICT (organization_id, module_key) DO UPDATE SET
    status           = 'in_trial',
    trial_started_at = now(),
    trial_ends_at    = now() + interval '30 days',
    activated_at     = COALESCE(public.organization_modules.activated_at, now()),
    deactivated_at   = NULL,
    updated_at       = now();

END $$;


-- ------------------------------------------------------------
-- 3a. Validate Ronyx org trial state
-- ------------------------------------------------------------

SELECT
  id,
  name,
  organization_code,
  status,
  account_type,
  subscription_status,
  bypass_subscription,
  subscription_required,
  pilot_started_at,
  pilot_ends_at,
  now() AS current_time,
  CEIL(EXTRACT(EPOCH FROM (pilot_ends_at - now())) / 86400)::int AS days_left,
  CASE
    WHEN status = 'active'
     AND account_type = 'free_trial'
     AND subscription_status = 'trial_active'
     AND bypass_subscription = true
     AND subscription_required = false
     AND pilot_ends_at > now()
    THEN 'TRIAL_ACTIVE — ACCESS_ALLOWED'
    ELSE 'BLOCKED — CHECK ABOVE FIELDS'
  END AS access_check
FROM public.organizations
WHERE lower(name) LIKE '%ronyx%'
   OR lower(organization_code) LIKE '%ronyx%'
   OR id = '00000000-0000-0000-0000-000000000001';


-- ------------------------------------------------------------
-- 3b. Validate trial modules (from the raw table)
-- ------------------------------------------------------------

SELECT
  om.module_key,
  om.module_name,
  om.category,
  om.status,
  om.trial_ends_at,
  CEIL(EXTRACT(EPOCH FROM (om.trial_ends_at - now())) / 86400)::int AS days_left
FROM public.organization_modules om
JOIN public.organizations o ON o.id = om.organization_id
WHERE lower(o.name) LIKE '%ronyx%'
   OR lower(o.organization_code) LIKE '%ronyx%'
   OR o.id = '00000000-0000-0000-0000-000000000001'
ORDER BY om.category, om.module_name;


-- ------------------------------------------------------------
-- 3c. Validate modules via the marketplace VIEW
--     (this is what the billing page and subscription API read)
-- ------------------------------------------------------------

SELECT
  module_key,
  module_name,
  category,
  status,
  trial_ends_at
FROM public.organization_module_marketplace
WHERE lower(organization_name) LIKE '%ronyx%'
ORDER BY category, module_name;


-- ------------------------------------------------------------
-- 3d. Check which users are connected to the Ronyx org
-- ------------------------------------------------------------

SELECT
  p.id              AS profile_id,
  p.email,
  p.full_name,
  p.role,
  p.status          AS profile_status,
  p.organization_id,
  o.name            AS organization_name,
  o.organization_code,
  o.account_type,
  o.subscription_status,
  o.pilot_ends_at
FROM public.profiles p
LEFT JOIN public.organizations o ON o.id = p.organization_id
WHERE lower(o.name) LIKE '%ronyx%'
   OR lower(o.organization_code) LIKE '%ronyx%'
   OR lower(p.email) LIKE '%ronyx%'
ORDER BY p.email;


-- ------------------------------------------------------------
-- 3e. (Manual step — uncomment and run after verifying org ID)
--     Connect a specific login email to the Ronyx org.
--
-- UPDATE public.profiles
-- SET organization_id = (
--   SELECT id FROM public.organizations
--   WHERE lower(name) LIKE '%ronyx%'
--      OR lower(organization_code) LIKE '%ronyx%'
--   ORDER BY
--     CASE
--       WHEN lower(name) LIKE '%ronyx%' OR lower(organization_code) LIKE '%ronyx%' THEN 0
--       ELSE 1
--     END
--   LIMIT 1
-- )
-- WHERE lower(email) = lower('PUT_RONYX_LOGIN_EMAIL_HERE')
-- RETURNING id, email, full_name, role, organization_id;
-- ------------------------------------------------------------
