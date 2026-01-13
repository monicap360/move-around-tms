-- ===========================================
-- MOVEAROUND TMS
-- MULTI-VERTICAL SYSTEM
-- Migration 052: Add vertical type support
-- ===========================================
-- 
-- Support 4 buyer types without branching the codebase:
-- - Construction Hauling
-- - Aggregates / Quarries
-- - Waste & Recycling
-- - Ready-Mix Concrete
--
-- Design: One shared data model, vertical logic in profiles

-- Add vertical_type to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS vertical_type text
  CHECK (vertical_type IN ('construction_hauling', 'aggregates_quarry', 'waste_recycling', 'ready_mix'))
  DEFAULT 'construction_hauling';

-- Index for vertical type queries
CREATE INDEX IF NOT EXISTS idx_organizations_vertical_type 
  ON public.organizations(vertical_type);

-- Add optional vertical_override to sites (if sites table exists)
-- Check if sites table exists first
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sites'
  ) THEN
    ALTER TABLE public.sites
      ADD COLUMN IF NOT EXISTS vertical_override text
      CHECK (vertical_override IN ('construction_hauling', 'aggregates_quarry', 'waste_recycling', 'ready_mix'));
      
    CREATE INDEX IF NOT EXISTS idx_sites_vertical_override 
      ON public.sites(vertical_override);
  END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN public.organizations.vertical_type IS 
  'Primary vertical/buyer type for this organization. Determines baseline windows, intelligence emphasis, and UI defaults.';

COMMENT ON COLUMN public.sites.vertical_override IS 
  'Optional vertical override at site level. If NULL, inherits from organization.vertical_type.';
