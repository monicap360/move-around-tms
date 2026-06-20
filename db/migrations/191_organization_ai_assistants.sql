-- 191_organization_ai_assistants.sql
-- Per-organization AI assistant branding profiles.
-- Keys, roles, capabilities, and system prompts are locked in the catalog (lib/ai/assistantCatalog.ts).
-- This table only stores visible identity preferences: name, avatar, greeting, tone, enabled.

CREATE TABLE IF NOT EXISTS public.organization_ai_assistants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assistant_key   text        NOT NULL,
  custom_name     text        NULL,
  avatar_style    text        NOT NULL DEFAULT 'default',
  greeting        text        NULL,
  tone            text        NOT NULL DEFAULT 'professional',
  is_enabled      boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_org_assistant UNIQUE (organization_id, assistant_key),

  CONSTRAINT chk_oaa_assistant_key CHECK (
    assistant_key IN (
      'leo','rory','toni','peyton','bella','nia',
      'wrench','atlas','nova','pat','breanna','shamsa'
    )
  ),
  CONSTRAINT chk_oaa_tone CHECK (
    tone IN ('professional','friendly','direct','upbeat','concise')
  ),
  CONSTRAINT chk_oaa_avatar_style CHECK (
    avatar_style IN (
      'default','command','logistics','finance','compliance','fleet','people','analytics'
    )
  ),
  CONSTRAINT chk_oaa_custom_name_len CHECK (
    custom_name IS NULL OR char_length(custom_name) <= 30
  ),
  CONSTRAINT chk_oaa_greeting_len CHECK (
    greeting IS NULL OR char_length(greeting) <= 180
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oaa_org     ON public.organization_ai_assistants(organization_id);
CREATE INDEX IF NOT EXISTS idx_oaa_key     ON public.organization_ai_assistants(assistant_key);
CREATE INDEX IF NOT EXISTS idx_oaa_org_key ON public.organization_ai_assistants(organization_id, assistant_key);
CREATE INDEX IF NOT EXISTS idx_oaa_enabled ON public.organization_ai_assistants(organization_id, is_enabled);

-- updated_at trigger (project standard pattern)
CREATE OR REPLACE FUNCTION public.set_oaa_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_oaa_updated_at ON public.organization_ai_assistants;
CREATE TRIGGER trg_oaa_updated_at
  BEFORE UPDATE ON public.organization_ai_assistants
  FOR EACH ROW EXECUTE FUNCTION public.set_oaa_updated_at();

-- RLS
ALTER TABLE public.organization_ai_assistants ENABLE ROW LEVEL SECURITY;

-- SELECT: any active seat member can view their org's profiles
DROP POLICY IF EXISTS "oaa_select_own_org" ON public.organization_ai_assistants;
CREATE POLICY "oaa_select_own_org"
  ON public.organization_ai_assistants FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE  user_id = auth.uid() AND status = 'active'
    )
  );

-- UPDATE: active seat members can update display preferences; assistant_key is immutable (no column in SET)
DROP POLICY IF EXISTS "oaa_update_own_org" ON public.organization_ai_assistants;
CREATE POLICY "oaa_update_own_org"
  ON public.organization_ai_assistants FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE  user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE  user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: used only by the seed path (service role bypasses RLS; this policy allows anon seed via API)
DROP POLICY IF EXISTS "oaa_insert_own_org" ON public.organization_ai_assistants;
CREATE POLICY "oaa_insert_own_org"
  ON public.organization_ai_assistants FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE  user_id = auth.uid() AND status = 'active'
    )
  );

-- No DELETE policy — records are reset (fields nulled), never deleted
