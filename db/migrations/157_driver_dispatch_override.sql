-- Migration 157: Driver dispatch override fields
-- Allows an admin to manually override a blocked driver and allow dispatch.
-- dispatch_override = true means "admin has approved dispatch despite compliance blocks"
-- dispatch_override_by = who set the override (always 'admin' for now)

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS dispatch_override        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatch_override_by     text,
  ADD COLUMN IF NOT EXISTS dispatch_override_reason text,
  ADD COLUMN IF NOT EXISTS dispatch_override_at     timestamptz;

-- Also add to ronyx_owner_operators for OO-level dispatch override
ALTER TABLE public.ronyx_owner_operators
  ADD COLUMN IF NOT EXISTS dispatch_override        boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatch_override_by     text,
  ADD COLUMN IF NOT EXISTS dispatch_override_reason text,
  ADD COLUMN IF NOT EXISTS dispatch_override_at     timestamptz;

CREATE INDEX IF NOT EXISTS idx_driver_profiles_dispatch_override
  ON public.driver_profiles (dispatch_override) WHERE dispatch_override = true;
