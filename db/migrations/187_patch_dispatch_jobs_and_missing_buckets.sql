-- ============================================================
-- Migration 187: Patch dispatch_jobs + Create missing storage buckets
-- ============================================================

-- ── 1. Add compliance_action column to dispatch_jobs if missing ──────────────
-- dispatch_jobs was created by migration 128 WITH this column, but if the
-- table pre-existed (e.g. created via Studio before 128 ran) the column
-- would be absent. This ADD COLUMN IF NOT EXISTS is safe to run either way.

ALTER TABLE public.dispatch_jobs
  ADD COLUMN IF NOT EXISTS compliance_action text;

-- Also ensure the other columns from 144/145 exist (safe no-ops if present)
ALTER TABLE public.dispatch_jobs
  ADD COLUMN IF NOT EXISTS recommended_action      text,
  ADD COLUMN IF NOT EXISTS dispatch_guard_status   text DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS rmis_classification     text,
  ADD COLUMN IF NOT EXISTS match_confidence        numeric(5,2),
  ADD COLUMN IF NOT EXISTS row_status              text DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS next_best_action        text;


-- ── 2. Create missing private storage buckets ────────────────────────────────
-- All driver/OO/maintenance documents must stay PRIVATE.
-- Only oo-logos is public (branding only, non-sensitive).

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  -- OO logos — public (branding, not sensitive)
  ('oo-logos',               'oo-logos',               true,  5242880),
  -- Driver documents — private (CDL, medical cards, etc.)
  ('ronyx-driver-documents', 'ronyx-driver-documents', false, 31457280),
  -- E-signature documents — private
  ('esign',                  'esign',                  false, 31457280),
  -- Maintenance documents — private
  ('maintenance-docs',       'maintenance-docs',        false, 31457280),
  -- Original uploads backup — private
  ('ronyx-original-uploads', 'ronyx-original-uploads', false, 104857600),
  -- AccuriScale ticket images — private
  ('scale_ticket_images',    'scale_ticket_images',     false, 31457280),
  -- HR documents (driver applications, onboarding) — private
  ('hr_docs',                'hr_docs',                 false, 31457280),
  -- Company assets / avatars — private
  ('company_assets',         'company_assets',          false, 10485760),
  ('avatars',                'avatars',                 false, 5242880)
ON CONFLICT (id) DO NOTHING;


-- ── 3. Service-role access policies for every new bucket ─────────────────────

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY[
    'oo-logos', 'ronyx-driver-documents', 'esign', 'maintenance-docs',
    'ronyx-original-uploads', 'scale_ticket_images', 'hr_docs',
    'company_assets', 'avatars'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename  = 'objects'
        AND policyname = b || ' service role full access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR ALL TO service_role
         USING (bucket_id = %L) WITH CHECK (bucket_id = %L)',
        b || ' service role full access', b, b
      );
    END IF;
  END LOOP;
END $$;


-- ── 4. Verify ────────────────────────────────────────────────────────────────

SELECT id, name, public, file_size_limit
FROM storage.buckets
ORDER BY name;
