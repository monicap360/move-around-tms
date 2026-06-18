-- Migration 164: Add CCB (Carrier Clearance Bureau) as a paid module

INSERT INTO public.modules (
  slug, name, description, monthly_price, category, icon,
  included_in_plans, sort_order, is_active
) VALUES (
  'ccb',
  'CCB — Carrier Clearance Bureau',
  'Carrier vetting, clearance status, billing risk scoring, compliance controls, dispatch holds, account blocks, and full audit history for owner operators and sub-haulers.',
  199,
  'compliance',
  '🏛️',
  ARRAY['enterprise', 'enterprise-plus'],
  11,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  included_in_plans = EXCLUDED.included_in_plans;
