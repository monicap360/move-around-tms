-- 193_integration_hub.sql
-- Org-level webhook endpoints and API keys for the Integration Hub.

-- ── Webhooks ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_webhooks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  url             text        NOT NULL,
  events          text[]      NOT NULL DEFAULT '{}',
  secret_hash     text        NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  last_triggered  timestamptz NULL,
  last_status     text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_owh_url_len  CHECK (char_length(url) <= 512),
  CONSTRAINT chk_owh_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_owh_org ON public.organization_webhooks(organization_id);

CREATE OR REPLACE FUNCTION public.set_owh_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_owh_updated_at ON public.organization_webhooks;
CREATE TRIGGER trg_owh_updated_at
  BEFORE UPDATE ON public.organization_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_owh_updated_at();

ALTER TABLE public.organization_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owh_select_own_org" ON public.organization_webhooks;
CREATE POLICY "owh_select_own_org" ON public.organization_webhooks FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "owh_insert_own_org" ON public.organization_webhooks;
CREATE POLICY "owh_insert_own_org" ON public.organization_webhooks FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "owh_update_own_org" ON public.organization_webhooks;
CREATE POLICY "owh_update_own_org" ON public.organization_webhooks FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "owh_delete_own_org" ON public.organization_webhooks;
CREATE POLICY "owh_delete_own_org" ON public.organization_webhooks FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

-- ── API Keys ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_api_keys (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  key_prefix      text        NOT NULL,
  key_hash        text        NOT NULL,
  scopes          text[]      NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  last_used       timestamptz NULL,
  expires_at      timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_oak_name_len CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT chk_oak_prefix   CHECK (key_prefix ~ '^mav_[a-z0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS idx_oak_org    ON public.organization_api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_oak_prefix ON public.organization_api_keys(key_prefix);

CREATE OR REPLACE FUNCTION public.set_oak_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_oak_updated_at ON public.organization_api_keys;
CREATE TRIGGER trg_oak_updated_at
  BEFORE UPDATE ON public.organization_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_oak_updated_at();

ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oak_select_own_org" ON public.organization_api_keys;
CREATE POLICY "oak_select_own_org" ON public.organization_api_keys FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "oak_insert_own_org" ON public.organization_api_keys;
CREATE POLICY "oak_insert_own_org" ON public.organization_api_keys FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "oak_update_own_org" ON public.organization_api_keys;
CREATE POLICY "oak_update_own_org" ON public.organization_api_keys FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

DROP POLICY IF EXISTS "oak_delete_own_org" ON public.organization_api_keys;
CREATE POLICY "oak_delete_own_org" ON public.organization_api_keys FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

-- ── CSV Import Mapping Profiles ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_import_mappings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  source_type     text        NOT NULL,
  target_entity   text        NOT NULL,
  column_map      jsonb       NOT NULL DEFAULT '{}',
  static_values   jsonb       NOT NULL DEFAULT '{}',
  transform_rules jsonb       NOT NULL DEFAULT '{}',
  is_default      boolean     NOT NULL DEFAULT false,
  last_used       timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_oim_source_type CHECK (
    source_type IN ('csv','erocks','fast_weigh','command_alkon','scale_ticket','payout_sheet','custom')
  ),
  CONSTRAINT chk_oim_target CHECK (
    target_entity IN ('jobs','tickets','drivers','trucks','payroll','billing','dispatch')
  )
);

CREATE INDEX IF NOT EXISTS idx_oim_org    ON public.organization_import_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_oim_source ON public.organization_import_mappings(organization_id, source_type);

CREATE OR REPLACE FUNCTION public.set_oim_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_oim_updated_at ON public.organization_import_mappings;
CREATE TRIGGER trg_oim_updated_at
  BEFORE UPDATE ON public.organization_import_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_oim_updated_at();

ALTER TABLE public.organization_import_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oim_all_own_org" ON public.organization_import_mappings;
CREATE POLICY "oim_all_own_org" ON public.organization_import_mappings
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));
