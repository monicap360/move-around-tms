-- ============================================================
-- Migration 175: Add Be Audit Ready™ to module registry
--               and seed as in_trial for Ronyx.
-- Safe to re-run (ON CONFLICT DO UPDATE).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Add to module_registry (global product catalog)
-- ------------------------------------------------------------

INSERT INTO public.module_registry (
  module_key,
  module_name,
  module_subtitle,
  category,
  description,
  features,
  default_status,
  price_monthly,
  price_label,
  included_in_plan,
  sort_order,
  is_trial_included,
  is_enterprise_add_on
)
VALUES (
  'be_audit_ready',
  'Be Audit Ready™',
  'Compliance Add-On',
  'Compliance',
  'Audit readiness command center for drivers, trucks, owner operators, tickets, payroll, billing, insurance, IFTA, and customer requirements.',
  ARRAY[
    'Audit Readiness Score',
    'Critical missing document alerts',
    'Driver compliance audit (CDL, medical, MVR, drug test, background check)',
    'Fleet compliance audit (registration, insurance, inspection, IFTA decal)',
    'Owner operator COI checks (auto liability, GL, cargo, workers comp)',
    'Ticket-to-pay proof verification',
    'Billing proof and reconciliation',
    'IFTA readiness tracking',
    'Audit Packet Builder',
    'Activity log'
  ],
  'available',
  149,
  '+$149/mo add-on · Included in Enterprise & Enterprise Plus',
  ARRAY['enterprise', 'enterprise_plus'],
  360,
  false,
  false
)
ON CONFLICT (module_key)
DO UPDATE SET
  module_name         = excluded.module_name,
  module_subtitle     = excluded.module_subtitle,
  category            = excluded.category,
  description         = excluded.description,
  features            = excluded.features,
  default_status      = excluded.default_status,
  price_monthly       = excluded.price_monthly,
  price_label         = excluded.price_label,
  included_in_plan    = excluded.included_in_plan,
  sort_order          = excluded.sort_order,
  is_trial_included   = excluded.is_trial_included,
  is_enterprise_add_on = excluded.is_enterprise_add_on,
  updated_at          = now();


-- ------------------------------------------------------------
-- 2. Seed as in_trial for Ronyx
-- ------------------------------------------------------------

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE lower(name) LIKE '%ronyx%'
     OR lower(organization_code) LIKE '%ronyx%'
     OR id = '00000000-0000-0000-0000-000000000001'
  ORDER BY
    CASE WHEN lower(name) LIKE '%ronyx%' OR lower(organization_code) LIKE '%ronyx%' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Ronyx org not found — skipping organization_modules seed for be_audit_ready.';
    RETURN;
  END IF;

  INSERT INTO public.organization_modules (
    organization_id, module_key, module_name, module_subtitle,
    category, status, description, features,
    price_monthly, price_label, included_in_plan,
    trial_started_at, trial_ends_at, activated_at
  )
  VALUES (
    v_org_id,
    'be_audit_ready',
    'Be Audit Ready™',
    'Compliance Add-On',
    'Compliance',
    'in_trial',
    'Audit readiness command center for drivers, trucks, owner operators, tickets, payroll, billing, insurance, IFTA, and customer requirements.',
    ARRAY[
      'Audit Readiness Score',
      'Missing document alerts',
      'Driver compliance audit',
      'Fleet compliance audit',
      'Owner operator COI checks',
      'Ticket-to-pay proof',
      'Billing proof',
      'IFTA readiness',
      'Audit Packet Builder',
      'Activity log'
    ],
    149,
    '+$149/mo add-on · Included in Enterprise & Enterprise Plus',
    ARRAY['enterprise', 'enterprise_plus'],
    now(),
    now() + interval '30 days',
    now()
  )
  ON CONFLICT (organization_id, module_key) DO UPDATE SET
    status           = 'in_trial',
    trial_started_at = now(),
    trial_ends_at    = now() + interval '30 days',
    activated_at     = COALESCE(public.organization_modules.activated_at, now()),
    deactivated_at   = NULL,
    updated_at       = now();

  RAISE NOTICE 'be_audit_ready seeded for org: %', v_org_id;
END $$;


-- ------------------------------------------------------------
-- 3. Validate
-- ------------------------------------------------------------

SELECT
  module_key, module_name, category, default_status, price_monthly, price_label
FROM public.module_registry
WHERE module_key = 'be_audit_ready';

SELECT
  om.module_key, om.status, om.trial_ends_at,
  CEIL(EXTRACT(EPOCH FROM (om.trial_ends_at - now())) / 86400)::int AS days_left
FROM public.organization_modules om
JOIN public.organizations o ON o.id = om.organization_id
WHERE om.module_key = 'be_audit_ready'
  AND (lower(o.name) LIKE '%ronyx%' OR lower(o.organization_code) LIKE '%ronyx%');
