-- Migration 155: Storage health snapshots + file archive records
-- Supports Storage Health page monitoring and Archive Center tiered storage tracking.

-- ── storage_health_snapshots ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storage_health_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at         timestamptz NOT NULL DEFAULT now(),
  storage_used_bytes  bigint,
  storage_limit_bytes bigint,
  storage_used_pct    numeric(5,2),
  total_files         integer,
  old_files_90d       integer,
  large_files_5mb     integer,
  db_total_rows       bigint,
  db_est_size_bytes   bigint,
  db_used_pct         numeric(5,2),
  est_monthly_cost    numeric(10,2),
  overage_gb          numeric(10,4),
  warnings            jsonb,
  bucket_details      jsonb,
  table_details       jsonb,
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_snapshots_org   ON public.storage_health_snapshots (organization_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_snapshots_pct   ON public.storage_health_snapshots (storage_used_pct DESC);

ALTER TABLE public.storage_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shs_select" ON public.storage_health_snapshots;
DROP POLICY IF EXISTS "shs_insert" ON public.storage_health_snapshots;

CREATE POLICY "shs_select" ON public.storage_health_snapshots
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

CREATE POLICY "shs_insert" ON public.storage_health_snapshots
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());


-- ── file_archive_records ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.file_archive_records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_upload_id  uuid        REFERENCES public.original_uploads(id) ON DELETE SET NULL,
  entity_type         text,                               -- ticket | driver | payout | invoice
  entity_id           uuid,
  file_name           text        NOT NULL,
  original_bucket     text,
  original_path       text,
  archive_tier        text        NOT NULL DEFAULT 'hot', -- hot | warm | cold
  archive_bucket      text,
  archive_path        text,
  archive_provider    text,                               -- supabase | cloudflare_r2 | backblaze_b2
  archive_url         text,
  file_size_bytes     bigint,
  archived_at         timestamptz,
  archive_expiry      timestamptz,
  restore_status      text        DEFAULT 'not_needed',   -- not_needed | requested | restoring | restored
  restore_requested_at timestamptz,
  restore_completed_at timestamptz,
  notes               text,
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_archive_org        ON public.file_archive_records (organization_id);
CREATE INDEX IF NOT EXISTS idx_file_archive_tier       ON public.file_archive_records (archive_tier);
CREATE INDEX IF NOT EXISTS idx_file_archive_entity     ON public.file_archive_records (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_archive_orig       ON public.file_archive_records (original_upload_id);
CREATE INDEX IF NOT EXISTS idx_file_archive_archived   ON public.file_archive_records (archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_archive_restore    ON public.file_archive_records (restore_status) WHERE restore_status != 'not_needed';

ALTER TABLE public.file_archive_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "far_select" ON public.file_archive_records;
DROP POLICY IF EXISTS "far_insert" ON public.file_archive_records;
DROP POLICY IF EXISTS "far_update" ON public.file_archive_records;

CREATE POLICY "far_select" ON public.file_archive_records
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());

CREATE POLICY "far_insert" ON public.file_archive_records
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "far_update" ON public.file_archive_records
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE OR REPLACE FUNCTION public.set_file_archive_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_file_archive_updated_at ON public.file_archive_records;
CREATE TRIGGER trg_file_archive_updated_at
  BEFORE UPDATE ON public.file_archive_records
  FOR EACH ROW EXECUTE FUNCTION public.set_file_archive_updated_at();
