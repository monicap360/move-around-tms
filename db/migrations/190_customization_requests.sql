-- ============================================================
-- Migration 190: Platform Customization Requests
--
-- Tracks change/customization requests submitted by company
-- owners and managers through the in-app request widget.
-- Each submission is saved here AND emailed to the platform team.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_customization_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  org_name       text,
  org_slug       text,
  page_or_feature text,
  description    text NOT NULL,
  priority       text NOT NULL DEFAULT 'normal', -- normal | urgent | low
  contact_name   text,
  contact_email  text,
  status         text NOT NULL DEFAULT 'new',    -- new | in_review | in_progress | completed | closed
  admin_notes    text,
  estimated_at   date,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcr_org     ON public.platform_customization_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_pcr_status  ON public.platform_customization_requests(status);
CREATE INDEX IF NOT EXISTS idx_pcr_created ON public.platform_customization_requests(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_pcr_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_pcr_updated_at ON public.platform_customization_requests;
CREATE TRIGGER trg_pcr_updated_at
  BEFORE UPDATE ON public.platform_customization_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_pcr_updated_at();

-- RLS: org users can insert and read their own requests; platform admins can read all
ALTER TABLE public.platform_customization_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_users_insert_requests" ON public.platform_customization_requests;
CREATE POLICY "org_users_insert_requests"
  ON public.platform_customization_requests FOR INSERT
  WITH CHECK (true); -- anyone authenticated can submit (service role used in API)

DROP POLICY IF EXISTS "org_users_read_own_requests" ON public.platform_customization_requests;
CREATE POLICY "org_users_read_own_requests"
  ON public.platform_customization_requests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_seats WHERE user_id = auth.uid() AND is_platform_admin = true AND status = 'active'
    )
  );

-- Verify
SELECT COUNT(*) AS request_count FROM public.platform_customization_requests;
