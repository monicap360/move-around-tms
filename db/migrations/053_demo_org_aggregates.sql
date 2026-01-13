-- ===========================================
-- MOVEAROUND TMS
-- DEMO ORGANIZATION: Acme Aggregates
-- Migration 053: Create aggregates demo org
-- ===========================================

-- Create demo organization: Acme Aggregates
INSERT INTO public.organizations (
  id,
  name,
  vertical_type,
  base_plan_active,
  setup_fee_paid,
  truck_count,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Acme Aggregates',
  'aggregates_quarry',
  true,
  true,
  5,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE name = 'Acme Aggregates'
)
RETURNING id;

-- Note: Demo data (drivers, tickets, anomalies) will be created via seed script
-- This migration only creates the organization structure

COMMENT ON TABLE public.organizations IS 
  'Demo org "Acme Aggregates" created with vertical_type=aggregates_quarry for aggregates-focused demo';
