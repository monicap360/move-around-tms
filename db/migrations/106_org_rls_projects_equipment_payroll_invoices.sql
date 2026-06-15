-- Migration 106: Org-isolated RLS for projects, equipment, payroll_items, invoice_reconciliation
-- =============================================================================
-- HOW IT WORKS
--   • current_user_org() reads the authenticated user's organization_id from
--     user_seats.  Every RLS policy delegates to this function.
--   • organization_id DEFAULT public.current_user_org() means that authenticated
--     client-side inserts don't need to explicitly pass organization_id — it is
--     filled in automatically from the user's session.
--   • service_role (used by all server-side API routes) BYPASSES RLS entirely
--     in Supabase — no policy needed, no app changes required.
--   • INSERT WITH CHECK and SELECT/UPDATE/DELETE USING all use the same
--     current_user_org() expression, so the same row guard applies to all four
--     operations consistently.
-- =============================================================================


-- ============================================================================
-- SECTION 0 — current_user_org() helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM   public.user_seats
  WHERE  user_id = auth.uid()
  LIMIT  1;
$$;

COMMENT ON FUNCTION public.current_user_org() IS
  'Returns the organization_id of the currently authenticated user. '
  'Returns NULL when called as service_role (auth.uid() = NULL). '
  'SECURITY DEFINER so it can read user_seats regardless of caller privileges.';


-- ============================================================================
-- SECTION 1 — projects
-- ============================================================================

-- 1a. Add column (no-op if already present)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 1b. Set DEFAULT so authenticated inserts fill org_id automatically.
--     service_role inserts should pass organization_id explicitly
--     (current_user_org() returns NULL for service_role sessions).
ALTER TABLE public.projects
  ALTER COLUMN organization_id SET DEFAULT public.current_user_org();

CREATE INDEX IF NOT EXISTS idx_projects_org_id
  ON public.projects(organization_id);

-- 1c. Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1d. Wipe ALL existing policies regardless of their names (handles Supabase-
--     UI-generated policy names we don't know in advance).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.projects', pol.policyname);
  END LOOP;
END $$;

-- 1e. Per-operation org-scoped policies
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- SECTION 2 — equipment
-- ============================================================================

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.equipment
  ALTER COLUMN organization_id SET DEFAULT public.current_user_org();

CREATE INDEX IF NOT EXISTS idx_equipment_org_id
  ON public.equipment(organization_id);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'equipment'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.equipment', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "equipment_select" ON public.equipment
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "equipment_insert" ON public.equipment
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "equipment_update" ON public.equipment
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "equipment_delete" ON public.equipment
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- SECTION 3 — payroll_items
-- ============================================================================

ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.payroll_items
  ALTER COLUMN organization_id SET DEFAULT public.current_user_org();

CREATE INDEX IF NOT EXISTS idx_payroll_items_org_id
  ON public.payroll_items(organization_id);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'payroll_items'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.payroll_items', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "payroll_items_select" ON public.payroll_items
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "payroll_items_insert" ON public.payroll_items
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "payroll_items_update" ON public.payroll_items
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "payroll_items_delete" ON public.payroll_items
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- SECTION 4 — invoice_reconciliation
-- ============================================================================

ALTER TABLE public.invoice_reconciliation
  ADD COLUMN IF NOT EXISTS organization_id uuid
    REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_reconciliation
  ALTER COLUMN organization_id SET DEFAULT public.current_user_org();

CREATE INDEX IF NOT EXISTS idx_invoice_recon_org_id
  ON public.invoice_reconciliation(organization_id);

ALTER TABLE public.invoice_reconciliation ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'invoice_reconciliation'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.invoice_reconciliation', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "invoice_recon_select" ON public.invoice_reconciliation
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "invoice_recon_insert" ON public.invoice_reconciliation
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "invoice_recon_update" ON public.invoice_reconciliation
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "invoice_recon_delete" ON public.invoice_reconciliation
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ============================================================================
-- SECTION 5 — Performance indexes for RLS joins
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_seats_uid_org_106
  ON public.user_seats(user_id, organization_id);
