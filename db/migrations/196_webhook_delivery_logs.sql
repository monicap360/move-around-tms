-- 196_webhook_delivery_logs.sql
-- Tracks every webhook delivery attempt, response, retry, and final status.
-- Required so office staff can see whether a webhook actually reached its endpoint.

CREATE TABLE IF NOT EXISTS public.organization_webhook_deliveries (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_id       uuid        NOT NULL REFERENCES public.organization_webhooks(id) ON DELETE CASCADE,

  event_type       text        NOT NULL,
  payload          jsonb       NOT NULL DEFAULT '{}'::jsonb,

  response_status  integer     NULL,
  response_body    text        NULL,
  delivery_status  text        NOT NULL DEFAULT 'pending',
  attempt_count    integer     NOT NULL DEFAULT 0,
  next_retry_at    timestamptz NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at     timestamptz NULL,

  CONSTRAINT chk_owd_status CHECK (
    delivery_status IN ('pending','success','failed','retrying','abandoned')
  )
);

CREATE INDEX IF NOT EXISTS idx_owd_org     ON public.organization_webhook_deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_owd_webhook ON public.organization_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_owd_status  ON public.organization_webhook_deliveries(organization_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_owd_created ON public.organization_webhook_deliveries(created_at DESC);

ALTER TABLE public.organization_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Read: any active org member can view delivery logs for their org
CREATE POLICY "owd_select_own_org" ON public.organization_webhook_deliveries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- Write: only service role (backend) inserts delivery records
CREATE POLICY "owd_insert_service_only" ON public.organization_webhook_deliveries FOR INSERT
  WITH CHECK (false);

-- Add scopes column to api_keys if not present (supports per-key permission scoping)
ALTER TABLE public.organization_api_keys
  ADD COLUMN IF NOT EXISTS scopes       text[]      NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_at   timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_by   text        NULL;

COMMENT ON COLUMN public.organization_api_keys.scopes IS
  'Allowed scopes: dispatch:read, dispatch:write, tickets:read, tickets:write, billing:read, billing:write, webhooks:manage, admin:manage';
