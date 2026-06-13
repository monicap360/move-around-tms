-- =============================================================================
-- Migration 096: RLS Security Hardening
-- Fixes Supabase Security Advisor findings:
--   • RLS disabled on 6 tables
--   • Overly permissive USING(true) policies for authenticated role
--   • Broken document_provenance policies referencing non-existent user_organizations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 0: Shared helper function
-- ---------------------------------------------------------------------------

-- is_admin() already exists (database-admin-migration.sql).
-- We just ensure it's stable and callable.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'is_admin() function is missing — run database-admin-migration.sql first';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 1: load_assignments
-- ---------------------------------------------------------------------------

ALTER TABLE public.load_assignments ENABLE ROW LEVEL SECURITY;

-- Remove any catch-all permissive policies
DROP POLICY IF EXISTS "Enable all for authenticated"  ON public.load_assignments;
DROP POLICY IF EXISTS "open_access"                   ON public.load_assignments;
DROP POLICY IF EXISTS "load_assignments_all"          ON public.load_assignments;

-- Admins: full access
DROP POLICY IF EXISTS "la_admin" ON public.load_assignments;
CREATE POLICY "la_admin" ON public.load_assignments
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Org members: access rows whose load belongs to their organization
DROP POLICY IF EXISTS "la_org_member" ON public.load_assignments;
CREATE POLICY "la_org_member" ON public.load_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_assignments.load_id
        AND  us.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_assignments.load_id
        AND  us.user_id = auth.uid()
    )
  );

-- Drivers: read-only access to their own assignments
DROP POLICY IF EXISTS "la_driver_own" ON public.load_assignments;
CREATE POLICY "la_driver_own" ON public.load_assignments
  FOR SELECT TO authenticated
  USING (
    driver_id IN (
      SELECT d.id FROM public.drivers d WHERE d.driver_uuid = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 2: load_stops
-- (Schema assumption: has load_id UUID referencing loads.id)
-- ---------------------------------------------------------------------------

ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated"  ON public.load_stops;
DROP POLICY IF EXISTS "open_access"                   ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_all"                ON public.load_stops;

DROP POLICY IF EXISTS "ls_admin" ON public.load_stops;
CREATE POLICY "ls_admin" ON public.load_stops
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ls_org_member" ON public.load_stops;
CREATE POLICY "ls_org_member" ON public.load_stops
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_stops.load_id
        AND  us.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_stops.load_id
        AND  us.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 3: load_documents
-- ---------------------------------------------------------------------------

ALTER TABLE public.load_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated"  ON public.load_documents;
DROP POLICY IF EXISTS "open_access"                   ON public.load_documents;
DROP POLICY IF EXISTS "load_documents_all"            ON public.load_documents;

DROP POLICY IF EXISTS "ld_admin" ON public.load_documents;
CREATE POLICY "ld_admin" ON public.load_documents
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ld_org_member" ON public.load_documents;
CREATE POLICY "ld_org_member" ON public.load_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_documents.load_id
        AND  us.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_documents.load_id
        AND  us.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 4: load_status_history
-- (History is append-only: org members can INSERT and SELECT; no UPDATE/DELETE)
-- ---------------------------------------------------------------------------

ALTER TABLE public.load_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated"  ON public.load_status_history;
DROP POLICY IF EXISTS "open_access"                   ON public.load_status_history;
DROP POLICY IF EXISTS "load_status_history_all"       ON public.load_status_history;

DROP POLICY IF EXISTS "lsh_admin" ON public.load_status_history;
CREATE POLICY "lsh_admin" ON public.load_status_history
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lsh_org_read" ON public.load_status_history;
CREATE POLICY "lsh_org_read" ON public.load_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_status_history.load_id
        AND  us.user_id = auth.uid()
    )
  );

-- Allow org members to append history entries (no UPDATE/DELETE by design)
DROP POLICY IF EXISTS "lsh_org_insert" ON public.load_status_history;
CREATE POLICY "lsh_org_insert" ON public.load_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.loads      l
      JOIN   public.user_seats us ON us.organization_id = l.organization_id
      WHERE  l.id = load_status_history.load_id
        AND  us.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- SECTION 5: document_provenance
-- Fix broken migration 040 policies that referenced non-existent user_organizations.
-- Note: organization_id column is TEXT (not UUID) — cast required.
-- ---------------------------------------------------------------------------

-- Drop broken policies from migration 040
DROP POLICY IF EXISTS "Users can view provenance for their organization"  ON public.document_provenance;
DROP POLICY IF EXISTS "Users can create provenance for their organization" ON public.document_provenance;

-- Re-enable (idempotent)
ALTER TABLE public.document_provenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dp_admin" ON public.document_provenance;
CREATE POLICY "dp_admin" ON public.document_provenance
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Org members: match on organization_id (TEXT) by casting user_seats.organization_id::text
DROP POLICY IF EXISTS "dp_org_member" ON public.document_provenance;
CREATE POLICY "dp_org_member" ON public.document_provenance
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.user_seats us
      WHERE  us.organization_id::text = document_provenance.organization_id
        AND  us.user_id = auth.uid()
    )
    OR document_provenance.user_id = auth.uid()::text
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   public.user_seats us
      WHERE  us.organization_id::text = document_provenance.organization_id
        AND  us.user_id = auth.uid()
    )
    OR document_provenance.user_id = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- SECTION 6: document_access_log
-- Fix broken migration 040 policies and tighten the WITH CHECK (true) insert.
-- ---------------------------------------------------------------------------

-- Drop broken policies from migration 040
DROP POLICY IF EXISTS "Users can view access logs for their organization"  ON public.document_access_log;
DROP POLICY IF EXISTS "System can insert access logs"                       ON public.document_access_log;

ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dal_admin" ON public.document_access_log;
CREATE POLICY "dal_admin" ON public.document_access_log
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can view their own access entries;
-- org-level managers (HR/admin seat) can see all entries for their org's documents
DROP POLICY IF EXISTS "dal_read" ON public.document_access_log;
CREATE POLICY "dal_read" ON public.document_access_log
  FOR SELECT TO authenticated
  USING (
    -- Own access entries
    document_access_log.user_id = auth.uid()::text
    OR
    -- Org managers: document belongs to their org
    EXISTS (
      SELECT 1
      FROM   public.document_provenance dp
      JOIN   public.user_seats          us ON us.organization_id::text = dp.organization_id
      WHERE  dp.document_id = document_access_log.document_id
        AND  us.user_id = auth.uid()
        AND  us.role IN ('owner', 'admin', 'hr', 'super_admin')
    )
  );

-- Insert: only allow logging your own access (user_id must match caller)
DROP POLICY IF EXISTS "dal_insert_own" ON public.document_access_log;
CREATE POLICY "dal_insert_own" ON public.document_access_log
  FOR INSERT TO authenticated
  WITH CHECK (
    document_access_log.user_id = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- SECTION 7: Fix overly permissive USING(true) policies on ticket tables
-- (Migration 050 set USING(true) as a TODO placeholder)
-- ---------------------------------------------------------------------------

-- ticket_legs: replace open SELECT with org-scoped read
DROP POLICY IF EXISTS "Users can view ticket legs" ON public.ticket_legs;
CREATE POLICY "ticket_legs_org_read" ON public.ticket_legs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.aggregate_tickets t
      JOIN   public.user_seats        us ON us.organization_id = t.organization_id
      WHERE  t.id = ticket_legs.ticket_id
        AND  us.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ticket_leg_financials: scoped through ticket_legs → aggregate_tickets
DROP POLICY IF EXISTS "Users can view leg financials" ON public.ticket_leg_financials;
CREATE POLICY "tlf_org_read" ON public.ticket_leg_financials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.ticket_legs tl
      JOIN   public.aggregate_tickets t  ON t.id = tl.ticket_id
      JOIN   public.user_seats        us ON us.organization_id = t.organization_id
      WHERE  tl.id = ticket_leg_financials.leg_id
        AND  us.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ticket_leg_documents: same chain
DROP POLICY IF EXISTS "Users can view leg documents" ON public.ticket_leg_documents;
CREATE POLICY "tld_org_read" ON public.ticket_leg_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.ticket_legs tl
      JOIN   public.aggregate_tickets t  ON t.id = tl.ticket_id
      JOIN   public.user_seats        us ON us.organization_id = t.organization_id
      WHERE  tl.id = ticket_leg_documents.leg_id
        AND  us.user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- SECTION 8: Block direct auth.users exposure
-- If any views in public schema SELECT from auth.users, restrict them.
-- ---------------------------------------------------------------------------

-- Revoke public SELECT on auth schema objects to prevent GraphQL leakage
REVOKE SELECT ON auth.users FROM anon, authenticated;

-- If company_assets_objects view exists and exposes auth data, replace it
-- with a security-invoker version that only exposes what the caller can see.
-- (This is safe to run even if the view doesn't exist — DO block handles it.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'company_assets_objects'
  ) THEN
    -- Add SECURITY INVOKER so the view runs as the calling user, not definer
    EXECUTE $sql$
      CREATE OR REPLACE VIEW public.company_assets_objects
      WITH (security_invoker = true) AS
      SELECT
        o.id,
        o.name,
        o.created_at,
        o.updated_at,
        o.last_accessed_at,
        o.metadata,
        public.first_folder_segment(o.name) AS user_folder
      FROM storage.objects o
      WHERE o.bucket_id = 'company_assets'
    $sql$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECTION 9: Indexes to keep the new RLS joins fast
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_seats_user_id  ON public.user_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_seats_org_id   ON public.user_seats(organization_id);
CREATE INDEX IF NOT EXISTS idx_loads_org_id        ON public.loads(organization_id);
