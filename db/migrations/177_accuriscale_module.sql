-- ============================================================
-- Migration 177: Add AccuriScale Intelligence™ to module registry
-- Safe to re-run (ON CONFLICT DO UPDATE).
-- ============================================================

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
  'accuriscale_intelligence',
  'AccuriScale Intelligence™',
  'Aggregate & Scale Intelligence',
  'Tickets & OCR',
  'Ticket matching, short-load detection, scale fraud monitoring, production tracking, and pit-to-pay reconciliation for aggregate and bulk material haulers.',
  ARRAY[
    'Scale ticket matching',
    'Short-load detection',
    'TicketFlash OCR connection',
    'Pit-to-pay workflow',
    'Destination weight verification',
    'Revenue leakage alerts',
    'Fraud pattern detection',
    'Production tracking',
    'Payroll and billing holds',
    'Invoice reconciliation'
  ],
  'available',
  399,
  '$399/mo base · Includes up to 2,000 tickets/month · Enterprise scale integrations available',
  ARRAY['enterprise', 'enterprise_plus'],
  250,
  false,
  true
)
ON CONFLICT (module_key)
DO UPDATE SET
  module_name          = excluded.module_name,
  module_subtitle      = excluded.module_subtitle,
  category             = excluded.category,
  description          = excluded.description,
  features             = excluded.features,
  default_status       = excluded.default_status,
  price_monthly        = excluded.price_monthly,
  price_label          = excluded.price_label,
  included_in_plan     = excluded.included_in_plan,
  sort_order           = excluded.sort_order,
  is_trial_included    = excluded.is_trial_included,
  is_enterprise_add_on = excluded.is_enterprise_add_on,
  updated_at           = now();


-- Validate
SELECT module_key, module_name, category, price_monthly, price_label
FROM public.module_registry
WHERE module_key = 'accuriscale_intelligence';
