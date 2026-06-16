-- Migration 143: Row-Level Security for RONYX ADMIN CONTROL CENTER tables
-- Tables: ronyx_admin_settings, ronyx_roles, ronyx_staff_users,
--         ronyx_document_routing_rules, ronyx_notification_rules, ronyx_admin_audit_logs
--
-- DESIGN NOTES
-- ─────────────────────────────────────────────────────────────────────────────
-- • All API routes use SUPABASE_SERVICE_KEY (service_role), which bypasses RLS
--   entirely. These policies protect direct authenticated-client access only.
-- • Seeded rows in migration 142 have organization_id = NULL (global defaults).
--   SELECT policies use (organization_id IS NULL OR organization_id = current_user_org())
--   so authenticated users can see both global defaults and their own org's overrides.
-- • INSERT / UPDATE / DELETE are limited to the user's own org — nobody can
--   mutate or delete the global NULL-org seed rows through a client session.
-- • ronyx_admin_audit_logs is append-only: SELECT + INSERT only, no UPDATE/DELETE.
-- • Depends on public.current_user_org() from migration 106.
-- ─────────────────────────────────────────────────────────────────────────────
-- SAFE TO RE-RUN: all statements are idempotent (IF NOT EXISTS, DROP IF EXISTS).
-- =============================================================================


-- ============================================================================
-- Guard: current_user_org() must exist (migration 106 creates it)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_user_org'
  ) THEN
    RAISE EXCEPTION
      'current_user_org() not found — run migration 106 before 143.';
  END IF;
END $$;


-- ============================================================================
-- 1. ronyx_admin_settings
-- ============================================================================

ALTER TABLE public.ronyx_admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ras_select" ON public.ronyx_admin_settings;
DROP POLICY IF EXISTS "ras_insert" ON public.ronyx_admin_settings;
DROP POLICY IF EXISTS "ras_update" ON public.ronyx_admin_settings;
DROP POLICY IF EXISTS "ras_delete" ON public.ronyx_admin_settings;

-- Authenticated users can see global defaults (NULL org) and their own org's overrides
CREATE POLICY "ras_select" ON public.ronyx_admin_settings
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.current_user_org()
  );

-- Can only write rows scoped to their own org
CREATE POLICY "ras_insert" ON public.ronyx_admin_settings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "ras_update" ON public.ronyx_admin_settings
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "ras_delete" ON public.ronyx_admin_settings
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- 2. ronyx_roles
-- ============================================================================

ALTER TABLE public.ronyx_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rr_select" ON public.ronyx_roles;
DROP POLICY IF EXISTS "rr_insert" ON public.ronyx_roles;
DROP POLICY IF EXISTS "rr_update" ON public.ronyx_roles;
DROP POLICY IF EXISTS "rr_delete" ON public.ronyx_roles;

-- See system roles (NULL org) + own org roles
CREATE POLICY "rr_select" ON public.ronyx_roles
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.current_user_org()
  );

-- Can only create custom roles for own org
CREATE POLICY "rr_insert" ON public.ronyx_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_org()
    AND is_system_role = false
  );

-- Can only edit non-system, own-org roles
CREATE POLICY "rr_update" ON public.ronyx_roles
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_org()
    AND is_system_role = false
  )
  WITH CHECK (
    organization_id = public.current_user_org()
    AND is_system_role = false
  );

CREATE POLICY "rr_delete" ON public.ronyx_roles
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_org()
    AND is_system_role = false
  );


-- ============================================================================
-- 3. ronyx_staff_users
-- ============================================================================

ALTER TABLE public.ronyx_staff_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsu_select" ON public.ronyx_staff_users;
DROP POLICY IF EXISTS "rsu_insert" ON public.ronyx_staff_users;
DROP POLICY IF EXISTS "rsu_update" ON public.ronyx_staff_users;
DROP POLICY IF EXISTS "rsu_delete" ON public.ronyx_staff_users;

CREATE POLICY "rsu_select" ON public.ronyx_staff_users
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "rsu_insert" ON public.ronyx_staff_users
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rsu_update" ON public.ronyx_staff_users
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rsu_delete" ON public.ronyx_staff_users
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- 4. ronyx_document_routing_rules
-- ============================================================================

ALTER TABLE public.ronyx_document_routing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rdrr_select" ON public.ronyx_document_routing_rules;
DROP POLICY IF EXISTS "rdrr_insert" ON public.ronyx_document_routing_rules;
DROP POLICY IF EXISTS "rdrr_update" ON public.ronyx_document_routing_rules;
DROP POLICY IF EXISTS "rdrr_delete" ON public.ronyx_document_routing_rules;

-- See global default rules (NULL org) + own overrides
CREATE POLICY "rdrr_select" ON public.ronyx_document_routing_rules
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.current_user_org()
  );

CREATE POLICY "rdrr_insert" ON public.ronyx_document_routing_rules
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rdrr_update" ON public.ronyx_document_routing_rules
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rdrr_delete" ON public.ronyx_document_routing_rules
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- 5. ronyx_notification_rules
-- ============================================================================

ALTER TABLE public.ronyx_notification_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rnr_select" ON public.ronyx_notification_rules;
DROP POLICY IF EXISTS "rnr_insert" ON public.ronyx_notification_rules;
DROP POLICY IF EXISTS "rnr_update" ON public.ronyx_notification_rules;
DROP POLICY IF EXISTS "rnr_delete" ON public.ronyx_notification_rules;

-- See global defaults + own org rules
CREATE POLICY "rnr_select" ON public.ronyx_notification_rules
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.current_user_org()
  );

CREATE POLICY "rnr_insert" ON public.ronyx_notification_rules
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rnr_update" ON public.ronyx_notification_rules
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rnr_delete" ON public.ronyx_notification_rules
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- 6. ronyx_admin_audit_logs  (append-only — no UPDATE or DELETE)
-- ============================================================================

ALTER TABLE public.ronyx_admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raal_select" ON public.ronyx_admin_audit_logs;
DROP POLICY IF EXISTS "raal_insert" ON public.ronyx_admin_audit_logs;
DROP POLICY IF EXISTS "raal_update" ON public.ronyx_admin_audit_logs;
DROP POLICY IF EXISTS "raal_delete" ON public.ronyx_admin_audit_logs;

CREATE POLICY "raal_select" ON public.ronyx_admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.current_user_org()
  );

CREATE POLICY "raal_insert" ON public.ronyx_admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

-- No UPDATE or DELETE — audit records are immutable.


-- ============================================================================
-- Verify
-- ============================================================================
DO $$
DECLARE
  tbl text;
  enabled boolean;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ronyx_admin_settings',
    'ronyx_roles',
    'ronyx_staff_users',
    'ronyx_document_routing_rules',
    'ronyx_notification_rules',
    'ronyx_admin_audit_logs'
  ] LOOP
    SELECT rowsecurity INTO enabled
    FROM pg_class
    WHERE relname = tbl AND relnamespace = 'public'::regnamespace;

    IF NOT enabled THEN
      RAISE EXCEPTION 'RLS not enabled on table: %', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration 143 complete — RLS enabled on all 6 admin tables.';
END $$;
