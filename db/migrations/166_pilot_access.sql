-- ============================================================
-- MIGRATION 166: Free Trial Access System
-- Adds trial/subscription bypass columns to organizations.
-- Does NOT remove existing billing tables — only adds bypass logic.
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS account_type          text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS pilot_started_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pilot_ends_at         timestamptz,
  ADD COLUMN IF NOT EXISTS bypass_subscription   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscription_status   text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pilot_notes           text;

-- Activate Ronyx on a 30-day free trial
UPDATE public.organizations
SET
  account_type          = 'free_trial',
  status                = 'active',
  subscription_status   = 'trial_active',
  bypass_subscription   = true,
  subscription_required = false,
  pilot_started_at      = COALESCE(pilot_started_at, now()),
  pilot_ends_at         = COALESCE(pilot_started_at, now()) + interval '30 days',
  pilot_notes           = 'Ronyx 30-day free trial. Full app access. Subscription page bypassed until trial ends.'
WHERE organization_code = 'RONYX'
   OR lower(name) = 'ronyx';

-- Validate — access rule does NOT depend on subscription_status value
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
  CASE
    WHEN status              = 'active'
     AND account_type        = 'free_trial'
     AND bypass_subscription = true
     AND subscription_required = false
     AND pilot_ends_at > now()
    THEN 'ACCESS_ALLOWED'
    ELSE 'ACCESS_BLOCKED'
  END AS access_check
FROM public.organizations
WHERE organization_code = 'RONYX'
   OR lower(name) = 'ronyx';
