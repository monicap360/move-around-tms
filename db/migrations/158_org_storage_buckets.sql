-- Migration 158: Organization-scoped storage — single bucket, org_id as root
--
-- Single bucket: tms-documents
-- Path structure: {org_id}/{module}/{entity_id?}/{filename}
--
-- Modules under org root:
--   fastscan/       — ticket scan images and PDFs
--   drivers/        — CDL, MVR, physicals, applications
--   equipment/      — maintenance docs, inspection sheets
--   compliance/     — COIs, W-9s, RMIS, drug/background
--   payroll/        — pay sheets, settlement reports
--   settlements/    — contractor settlement packets
--   customers/      — customer-facing docs and contracts
--   projects/       — job site docs, permits, plans
--   invoices/       — customer invoices, billing packets
--   contracts/      — subhauler agreements, ACH, OO contracts
--   audit/          — closeout exports, backup archives
--
-- All server-side writes use the service role key (bypasses RLS).
-- Client reads always go through /api/ronyx/view-doc (signed URL).

INSERT INTO storage.buckets (id, name, public, file_size_limit, avif_autodetection)
VALUES ('tms-documents', 'tms-documents', false, 104857600, false)  -- 100 MB cap
ON CONFLICT (id) DO NOTHING;

-- ── RLS — SELECT: authenticated user whose org_id matches the path root ──────
-- Uses the same user_seats pattern as all other RLS in this project:
--   public.user_seats { user_id, organization_id }
-- The org_id is stored as the first folder segment of every file path.
-- Admins (is_admin()) always have full access.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'tms_docs_authenticated_select'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "tms_docs_authenticated_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'tms-documents'
        AND (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.user_id = auth.uid()
              AND us.organization_id::text = (storage.foldername(name))[1]
          )
        )
      );
  END IF;
END $$;

-- INSERT: blocked for direct client upload — all writes go through API routes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'tms_docs_deny_direct_insert'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "tms_docs_deny_direct_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (false);
  END IF;
END $$;

-- DELETE: blocked for direct client — deletes go through API routes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'tms_docs_deny_direct_delete'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "tms_docs_deny_direct_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (false);
  END IF;
END $$;
