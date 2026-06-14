-- Migration 101: Enable RLS on ronyx_oo_* tables
-- All server-side API routes use the service_role key, which bypasses RLS automatically.
-- These policies protect against direct anon/authenticated queries (e.g., leaked anon key).

-- ---------------------------------------------------------------------------
-- ronyx_owner_operators
-- ---------------------------------------------------------------------------
ALTER TABLE public.ronyx_owner_operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roo_admin"    ON public.ronyx_owner_operators;
DROP POLICY IF EXISTS "roo_org_all"  ON public.ronyx_owner_operators;

-- Admins: full access
CREATE POLICY "roo_admin" ON public.ronyx_owner_operators
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Org members: access records belonging to their organization,
-- OR records with no organization_id yet (during bootstrap/import).
CREATE POLICY "roo_org_all" ON public.ronyx_owner_operators
  FOR ALL TO authenticated
  USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_seats us
      WHERE us.organization_id = ronyx_owner_operators.organization_id
        AND us.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_seats us
      WHERE us.organization_id = ronyx_owner_operators.organization_id
        AND us.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ronyx_oo_drivers
-- ---------------------------------------------------------------------------
ALTER TABLE public.ronyx_oo_drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rod_admin"   ON public.ronyx_oo_drivers;
DROP POLICY IF EXISTS "rod_org_all" ON public.ronyx_oo_drivers;

CREATE POLICY "rod_admin" ON public.ronyx_oo_drivers
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- Access via parent OO company (same org membership check)
CREATE POLICY "rod_org_all" ON public.ronyx_oo_drivers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_drivers.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_drivers.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- ronyx_oo_trucks
-- ---------------------------------------------------------------------------
ALTER TABLE public.ronyx_oo_trucks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rot_admin"   ON public.ronyx_oo_trucks;
DROP POLICY IF EXISTS "rot_org_all" ON public.ronyx_oo_trucks;

CREATE POLICY "rot_admin" ON public.ronyx_oo_trucks
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "rot_org_all" ON public.ronyx_oo_trucks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_trucks.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_trucks.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- ronyx_oo_documents
-- ---------------------------------------------------------------------------
ALTER TABLE public.ronyx_oo_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rod2_admin"   ON public.ronyx_oo_documents;
DROP POLICY IF EXISTS "rod2_org_all" ON public.ronyx_oo_documents;

CREATE POLICY "rod2_admin" ON public.ronyx_oo_documents
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "rod2_org_all" ON public.ronyx_oo_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_documents.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_documents.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- ronyx_oo_jobs
-- ---------------------------------------------------------------------------
ALTER TABLE public.ronyx_oo_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roj_admin"   ON public.ronyx_oo_jobs;
DROP POLICY IF EXISTS "roj_org_all" ON public.ronyx_oo_jobs;

CREATE POLICY "roj_admin" ON public.ronyx_oo_jobs
  FOR ALL TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "roj_org_all" ON public.ronyx_oo_jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_jobs.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ronyx_owner_operators oo
      WHERE oo.id = ronyx_oo_jobs.oo_id
        AND (
          oo.organization_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.user_seats us
            WHERE us.organization_id = oo.organization_id
              AND us.user_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Performance: indexes to keep RLS joins fast
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_seats_uid_org
  ON public.user_seats(user_id, organization_id);
