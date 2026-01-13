-- ===========================================
-- MOVEAROUND TMS
-- DEMO ORGANIZATIONS: All 4 Verticals
-- Migration 055: Create demo orgs for all verticals
-- ===========================================
-- 
-- Creates demo organizations for:
-- - Aggregates/Quarry (Acme Aggregates - already in 054)
-- - Construction Hauling (ABC Construction)
-- - Waste & Recycling (Green Waste Solutions)
-- - Ready-Mix Concrete (Concrete Express)

-- Note: Acme Aggregates is created in migration 054
-- This migration creates the other 3 vertical demo orgs

DO $$
DECLARE
  org_id uuid;
BEGIN
  -- Construction Hauling: ABC Construction
  INSERT INTO public.organizations (
    name,
    vertical_type,
    base_plan_active,
    setup_fee_paid,
    truck_count,
    created_at,
    updated_at
  )
  VALUES (
    'ABC Construction',
    'construction_hauling',
    true,
    true,
    8,
    now() - interval '90 days',
    now()
  )
  ON CONFLICT (name) DO UPDATE
  SET vertical_type = 'construction_hauling',
      updated_at = now()
  RETURNING id INTO org_id;

  -- Waste & Recycling: Green Waste Solutions
  INSERT INTO public.organizations (
    name,
    vertical_type,
    base_plan_active,
    setup_fee_paid,
    truck_count,
    created_at,
    updated_at
  )
  VALUES (
    'Green Waste Solutions',
    'waste_recycling',
    true,
    true,
    12,
    now() - interval '90 days',
    now()
  )
  ON CONFLICT (name) DO UPDATE
  SET vertical_type = 'waste_recycling',
      updated_at = now()
  RETURNING id INTO org_id;

  -- Ready-Mix Concrete: Concrete Express
  INSERT INTO public.organizations (
    name,
    vertical_type,
    base_plan_active,
    setup_fee_paid,
    truck_count,
    created_at,
    updated_at
  )
  VALUES (
    'Concrete Express',
    'ready_mix',
    true,
    true,
    6,
    now() - interval '90 days',
    now()
  )
  ON CONFLICT (name) DO UPDATE
  SET vertical_type = 'ready_mix',
      updated_at = now()
  RETURNING id INTO org_id;

  RAISE NOTICE 'Demo organizations created for all 4 verticals';
END $$;

-- Comments
COMMENT ON TABLE public.organizations IS 
  'Demo orgs: Acme Aggregates (aggregates_quarry), ABC Construction (construction_hauling), Green Waste Solutions (waste_recycling), Concrete Express (ready_mix)';
