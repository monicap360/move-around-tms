-- Migration 154: original_uploads — source file tracking before any OCR or parsing
-- Every file that enters the system must create a row here BEFORE any parsing begins.
-- This guarantees we always have a reference to the original proof file.

CREATE TABLE IF NOT EXISTS public.original_uploads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       text        NOT NULL,
  storage_bucket  text        NOT NULL DEFAULT 'ronyx-fast-scan',
  storage_path    text        NOT NULL,
  file_size       bigint,
  file_type       text,                              -- image/jpeg, application/pdf, etc.
  upload_status   text        NOT NULL DEFAULT 'uploaded',  -- uploaded | failed | processing | archived
  upload_source   text,                              -- fast_scan | ccb | backup_vault | payroll | billing | import
  entity_type     text,                              -- ticket | driver | payout | invoice | document
  entity_id       uuid,                              -- FK to the resulting entity once parsed
  organization_id uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by     text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Add original_upload_id to aggregate_tickets so every ticket traces back to its source file
ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS original_upload_id uuid REFERENCES public.original_uploads(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orig_uploads_status      ON public.original_uploads (upload_status);
CREATE INDEX IF NOT EXISTS idx_orig_uploads_source      ON public.original_uploads (upload_source);
CREATE INDEX IF NOT EXISTS idx_orig_uploads_entity      ON public.original_uploads (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_orig_uploads_org         ON public.original_uploads (organization_id);
CREATE INDEX IF NOT EXISTS idx_orig_uploads_created     ON public.original_uploads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agg_tickets_orig_upload  ON public.aggregate_tickets (original_upload_id);

-- RLS
ALTER TABLE public.original_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ou_select" ON public.original_uploads;
DROP POLICY IF EXISTS "ou_insert" ON public.original_uploads;
DROP POLICY IF EXISTS "ou_update" ON public.original_uploads;

CREATE POLICY "ou_select" ON public.original_uploads
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

CREATE POLICY "ou_insert" ON public.original_uploads
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "ou_update" ON public.original_uploads
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_original_uploads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_original_uploads_updated_at ON public.original_uploads;
CREATE TRIGGER trg_original_uploads_updated_at
  BEFORE UPDATE ON public.original_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_original_uploads_updated_at();
