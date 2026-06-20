-- 197_admin_write_rls_for_settings_tables.sql
-- Tighten INSERT / UPDATE / DELETE on settings tables so only
-- owner, admin, system_admin, or integration_admin role can write.
-- Reads remain open to any active seat in the org.

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- Inline admin check used in every WITH CHECK below.
-- Returns the org_id for the calling user only when they hold an admin role.
CREATE OR REPLACE FUNCTION public.calling_user_admin_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id
  FROM   public.user_seats
  WHERE  user_id = auth.uid()
    AND  status  = 'active'
    AND  role    IN ('owner','admin','system_admin','integration_admin');
$$;

-- ── organization_custom_fields (migration 192) ─────────────────────────────

-- Drop the single permissive policy that allowed any active seat to write
DROP POLICY IF EXISTS "ocf_all_own_org" ON public.organization_custom_fields;

CREATE POLICY "ocf_select_own_org" ON public.organization_custom_fields
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "ocf_write_admin_only" ON public.organization_custom_fields
  FOR ALL
  USING  (organization_id IN (SELECT public.calling_user_admin_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.calling_user_admin_org_ids()));

-- ── organization_webhooks (migration 193) ─────────────────────────────────

DROP POLICY IF EXISTS "owh_all_own_org" ON public.organization_webhooks;

CREATE POLICY "owh_select_own_org" ON public.organization_webhooks
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "owh_write_admin_only" ON public.organization_webhooks
  FOR ALL
  USING  (organization_id IN (SELECT public.calling_user_admin_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.calling_user_admin_org_ids()));

-- ── organization_api_keys (migration 193) ──────────────────────────────────

DROP POLICY IF EXISTS "oak_all_own_org" ON public.organization_api_keys;

CREATE POLICY "oak_select_own_org" ON public.organization_api_keys
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "oak_write_admin_only" ON public.organization_api_keys
  FOR ALL
  USING  (organization_id IN (SELECT public.calling_user_admin_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.calling_user_admin_org_ids()));

-- ── organization_import_mappings (migration 193) ──────────────────────────

DROP POLICY IF EXISTS "oim_all_own_org" ON public.organization_import_mappings;

CREATE POLICY "oim_select_own_org" ON public.organization_import_mappings
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "oim_write_admin_only" ON public.organization_import_mappings
  FOR ALL
  USING  (organization_id IN (SELECT public.calling_user_admin_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.calling_user_admin_org_ids()));

-- ── organization_ai_assistants (migration 191) ─────────────────────────────

DROP POLICY IF EXISTS "oaa_all_own_org" ON public.organization_ai_assistants;

CREATE POLICY "oaa_select_own_org" ON public.organization_ai_assistants
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "oaa_write_admin_only" ON public.organization_ai_assistants
  FOR ALL
  USING  (organization_id IN (SELECT public.calling_user_admin_org_ids()))
  WITH CHECK (organization_id IN (SELECT public.calling_user_admin_org_ids()));
