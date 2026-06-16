-- Original Upload Preservation
-- Every uploaded file (CSV, PDF, Excel) must be stored and never mutated.
-- Staff corrections happen on parsed rows only.

CREATE TABLE IF NOT EXISTS public.original_uploads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid,

  module              text NOT NULL,         -- dispatch | payout | fastscan | payroll | drivers | compliance | billing | contracts
  source_file_name    text NOT NULL,
  storage_bucket      text NOT NULL DEFAULT 'ronyx-original-uploads',
  storage_path        text NOT NULL,

  file_type           text,                  -- csv | pdf | xlsx | txt | image
  file_size_bytes     bigint,
  mime_type           text,

  related_import_id   uuid,                  -- soft link — NOT a FK (preserves file even if import is deleted)
  related_table       text,                  -- dispatch_imports | payout_import_batches | etc.

  uploaded_by         uuid,
  uploaded_at         timestamptz DEFAULT now(),

  is_original         boolean DEFAULT true,
  is_deleted          boolean DEFAULT false,
  notes               text
);

CREATE INDEX IF NOT EXISTS idx_original_uploads_module ON public.original_uploads(module);
CREATE INDEX IF NOT EXISTS idx_original_uploads_uploaded_at ON public.original_uploads(uploaded_at DESC);

-- Payout import batch header (parallel to dispatch_imports)
CREATE TABLE IF NOT EXISTS public.payout_import_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid,
  import_name         text NOT NULL,
  source_file_name    text,
  original_upload_id  uuid,                  -- NOT FK — file survives if batch deleted
  storage_path        text,
  project_name        text,
  week_start          date,
  week_end            date,
  total_rows          integer DEFAULT 0,
  jobs_created        integer DEFAULT 0,
  oos_created         integer DEFAULT 0,
  grand_total         numeric(14,2) DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  created_by          uuid
);

-- Link dispatch_imports back to original upload (non-cascading)
ALTER TABLE public.dispatch_imports
  ADD COLUMN IF NOT EXISTS original_upload_id uuid,
  ADD COLUMN IF NOT EXISTS source_storage_path text;

-- Link ronyx_oo_jobs to payout batch
ALTER TABLE public.ronyx_oo_jobs
  ADD COLUMN IF NOT EXISTS payout_batch_id uuid;
