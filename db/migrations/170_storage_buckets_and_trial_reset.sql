-- ============================================================
-- Migration 170: Storage Buckets + Ronyx Trial Reset
-- File: db/migrations/170_storage_buckets_and_trial_reset.sql
-- Purpose:
-- - Create Supabase Storage buckets required for ticket upload
-- - Reset Ronyx trial to start 2026-06-18, end 2026-07-18 (30 days)
-- - Refresh Owner Operator Hub status to in_trial
-- ============================================================


-- ------------------------------------------------------------
-- 1. Create storage buckets for ticket file uploads
--    These are required by the following API routes:
--      /api/ronyx/fast-scan/upload  → tms-documents
--      /api/ronyx/tickets/upload    → ticket-uploads (primary), ronyx-imports, ronyx-files (fallbacks)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'tms-documents',
    'tms-documents',
    false,
    104857600,  -- 100 MB
    null        -- all types allowed; MIME validation happens in API routes
  ),
  (
    'ticket-uploads',
    'ticket-uploads',
    false,
    31457280,   -- 30 MB
    null
  ),
  (
    'ronyx-imports',
    'ronyx-imports',
    false,
    31457280,
    null
  ),
  (
    'ronyx-files',
    'ronyx-files',
    false,
    31457280,
    null
  )
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 2. Storage RLS policies — service role has implicit full access,
--    but these policies allow authenticated users to read their
--    own org's files if needed in the future.
-- ------------------------------------------------------------

-- tms-documents: service-role only (all ticket scans go here)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'tms-documents service role full access'
  ) THEN
    CREATE POLICY "tms-documents service role full access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'tms-documents')
    WITH CHECK (bucket_id = 'tms-documents');
  END IF;
END $$;

-- ticket-uploads: service-role only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'ticket-uploads service role full access'
  ) THEN
    CREATE POLICY "ticket-uploads service role full access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'ticket-uploads')
    WITH CHECK (bucket_id = 'ticket-uploads');
  END IF;
END $$;

-- ronyx-imports: service-role only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'ronyx-imports service role full access'
  ) THEN
    CREATE POLICY "ronyx-imports service role full access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'ronyx-imports')
    WITH CHECK (bucket_id = 'ronyx-imports');
  END IF;
END $$;

-- ronyx-files: service-role only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'ronyx-files service role full access'
  ) THEN
    CREATE POLICY "ronyx-files service role full access"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'ronyx-files')
    WITH CHECK (bucket_id = 'ronyx-files');
  END IF;
END $$;


-- ------------------------------------------------------------
-- 3. Reset Ronyx 30-day free trial — start 2026-06-18, end 2026-07-18
--    User requested: "activate owner operators module for ronyx
--    for 30 days free from todays start date" (today = 2026-06-18)
-- ------------------------------------------------------------

UPDATE public.organizations
SET
  status               = 'active',
  account_type         = 'free_trial',
  subscription_status  = 'trial_active',
  bypass_subscription  = true,
  subscription_required = false,
  pilot_started_at     = '2026-06-18 00:00:00+00'::timestamptz,
  pilot_ends_at        = '2026-07-18 00:00:00+00'::timestamptz,
  pilot_notes          = 'Ronyx 30-day free trial. Start: 2026-06-18. End: 2026-07-18. Reset by migration 170 per operator request.'
WHERE id = '00000000-0000-0000-0000-000000000001'
   OR lower(name) LIKE '%ronyx%'
   OR lower(organization_code) LIKE '%ronyx%';


-- ------------------------------------------------------------
-- 4. Refresh all in_trial modules with updated trial window
-- ------------------------------------------------------------

UPDATE public.organization_modules om
SET
  status           = 'in_trial',
  trial_started_at = '2026-06-18 00:00:00+00'::timestamptz,
  trial_ends_at    = '2026-07-18 00:00:00+00'::timestamptz,
  activated_at     = COALESCE(om.activated_at, now()),
  deactivated_at   = NULL,
  updated_at       = now()
FROM public.organizations o
WHERE om.organization_id = o.id
  AND (
    o.id = '00000000-0000-0000-0000-000000000001'
    OR lower(o.name) LIKE '%ronyx%'
    OR lower(o.organization_code) LIKE '%ronyx%'
  )
  AND om.status IN ('in_trial', 'active');


-- ------------------------------------------------------------
-- 5. Force owner_operator_hub explicitly to in_trial for Ronyx
--    (belt-and-suspenders — step 4 covers this but we make it explicit)
-- ------------------------------------------------------------

INSERT INTO public.organization_modules (
  organization_id,
  module_key,
  module_name,
  module_subtitle,
  category,
  status,
  description,
  features,
  price_monthly,
  price_label,
  included_in_plan,
  trial_started_at,
  trial_ends_at,
  activated_at
)
SELECT
  o.id,
  'owner_operator_hub',
  'Owner Operator Hub',
  'Operations',
  'Operations',
  'in_trial',
  'Manage owner operators, sub-haulers, contracts, insurance, drivers, trucks, documents, compliance, dispatch eligibility, and settlements.',
  ARRAY[
    'Owner operator profiles',
    'Sub-hauler management',
    'Contract tracking',
    'Auto Liability COI tracking',
    'General Liability COI tracking',
    'Cargo COI tracking',
    'Driver and truck assignment',
    'Settlement readiness',
    'Dispatch eligibility',
    'Compliance holds'
  ],
  0,
  'Included in Trial — active through 2026-07-18',
  ARRAY['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  '2026-06-18 00:00:00+00'::timestamptz,
  '2026-07-18 00:00:00+00'::timestamptz,
  now()
FROM public.organizations o
WHERE o.id = '00000000-0000-0000-0000-000000000001'
   OR lower(o.name) LIKE '%ronyx%'
   OR lower(o.organization_code) LIKE '%ronyx%'
ON CONFLICT (organization_id, module_key)
DO UPDATE SET
  status           = 'in_trial',
  module_name      = 'Owner Operator Hub',
  module_subtitle  = 'Operations',
  category         = 'Operations',
  price_label      = 'Included in Trial — active through 2026-07-18',
  trial_started_at = '2026-06-18 00:00:00+00'::timestamptz,
  trial_ends_at    = '2026-07-18 00:00:00+00'::timestamptz,
  activated_at     = COALESCE(public.organization_modules.activated_at, now()),
  deactivated_at   = NULL,
  updated_at       = now();


-- ------------------------------------------------------------
-- 6. Validation queries
-- ------------------------------------------------------------

-- 6a. Confirm Ronyx trial window
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
  now()                  AS current_time,
  pilot_ends_at - now()  AS time_left,
  CASE
    WHEN status = 'active'
     AND account_type = 'free_trial'
     AND subscription_status = 'trial_active'
     AND bypass_subscription = true
     AND subscription_required = false
     AND pilot_ends_at > now()
    THEN 'ACCESS_ALLOWED'
    ELSE 'ACCESS_BLOCKED'
  END AS access_check
FROM public.organizations
WHERE id = '00000000-0000-0000-0000-000000000001'
   OR lower(name) LIKE '%ronyx%'
   OR lower(organization_code) LIKE '%ronyx%';


-- 6b. Confirm Owner Operator Hub status
SELECT
  om.module_key,
  om.module_name,
  om.status,
  om.trial_started_at,
  om.trial_ends_at,
  GREATEST(0, CEIL(EXTRACT(EPOCH FROM (om.trial_ends_at - now())) / 86400)::int) AS days_left
FROM public.organization_modules om
JOIN public.organizations o ON o.id = om.organization_id
WHERE (
  o.id = '00000000-0000-0000-0000-000000000001'
  OR lower(o.name) LIKE '%ronyx%'
  OR lower(o.organization_code) LIKE '%ronyx%'
)
AND om.module_key = 'owner_operator_hub';


-- 6c. Confirm storage buckets
SELECT id, name, public, file_size_limit, created_at
FROM storage.buckets
WHERE id IN ('tms-documents', 'ticket-uploads', 'ronyx-imports', 'ronyx-files')
ORDER BY id;


-- 6d. Confirm all Ronyx module counts
SELECT
  o.name AS organization,
  COUNT(*) FILTER (WHERE om.status IN ('active', 'in_trial')) AS active_modules,
  COUNT(*) FILTER (WHERE om.status = 'in_trial')             AS trial_modules,
  COUNT(*) FILTER (WHERE om.status = 'available')            AS available_addons,
  MAX(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (om.trial_ends_at - now())) / 86400)::int)) AS trial_days_left
FROM public.organization_modules om
JOIN public.organizations o ON o.id = om.organization_id
WHERE o.id = '00000000-0000-0000-0000-000000000001'
   OR lower(o.name) LIKE '%ronyx%'
   OR lower(o.organization_code) LIKE '%ronyx%'
GROUP BY o.name;
