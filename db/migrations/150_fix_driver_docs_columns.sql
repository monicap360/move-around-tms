-- Migration 150: ensure ronyx_driver_documents has all required columns
-- Safe to run even if migration 095 or 123 already ran.

ALTER TABLE public.ronyx_driver_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS uploaded_by     text,
  ADD COLUMN IF NOT EXISTS file_url        text,
  ADD COLUMN IF NOT EXISTS notes           text,
  ADD COLUMN IF NOT EXISTS expires_on      date,
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now();

-- Ensure status has a sane default
ALTER TABLE public.ronyx_driver_documents
  ALTER COLUMN status SET DEFAULT 'uploaded';

CREATE INDEX IF NOT EXISTS idx_ronyx_driver_docs_driver  ON public.ronyx_driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_ronyx_driver_docs_type    ON public.ronyx_driver_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_ronyx_driver_docs_expires ON public.ronyx_driver_documents(expires_on);
