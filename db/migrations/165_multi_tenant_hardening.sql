-- ============================================================
-- MIGRATION 165: Multi-Tenant Hardening (corrected)
-- MoveAround TMS — Ronyx module
--
-- Organizations table real schema:
--   id uuid, organization_code text unique, name text, created_at timestamptz
--   + extra columns from 059: dot_number, mc_number, address, etc.
--   + extra columns from billing migration: paid_until, base_plan_active, etc.
--
-- App table names (actual):
--   aggregate_tickets, ronyx_trucks, ronyx_customers, ronyx_loads,
--   ronyx_invoices, ronyx_payroll_runs, ronyx_payroll_items, ronyx_owner_operators,
--   dispatch_jobs, drivers, fast_scan_documents, fast_scan_audit_events,
--   ticket_audit_log, driver_documents, owner_operators
--
-- Safe to run multiple times (all IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ============================================================
-- SECTION 1: Add status column to organizations if missing
-- (Some deployments have it, some don't — safe either way)
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- ============================================================
-- SECTION 2: Ensure user_seats has role + status columns
-- ============================================================

ALTER TABLE public.user_seats
  ADD COLUMN IF NOT EXISTS role   text NOT NULL DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- ============================================================
-- SECTION 3: Robust current_user_org() — tries user_seats then profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT organization_id FROM public.user_seats
     WHERE user_id = auth.uid() LIMIT 1),
    (SELECT organization_id FROM public.profiles
     WHERE id = auth.uid() LIMIT 1)
  );
$$;

-- ============================================================
-- SECTION 4: Create Ronyx organization (idempotent)
-- Uses organization_code = 'RONYX' — the real column name
-- ============================================================

INSERT INTO public.organizations (id, name, organization_code, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Ronyx',
  'RONYX',
  'active',
  now()
)
ON CONFLICT (id) DO UPDATE
  SET name             = COALESCE(organizations.name, 'Ronyx'),
      organization_code = COALESCE(organizations.organization_code, 'RONYX'),
      status           = COALESCE(organizations.status, 'active');

-- Also handle unique conflict on organization_code
INSERT INTO public.organizations (id, name, organization_code, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Ronyx',
  'RONYX',
  'active',
  now()
)
ON CONFLICT (organization_code) DO UPDATE
  SET id   = EXCLUDED.id,
      name = COALESCE(organizations.name, 'Ronyx');

DO $$
DECLARE ronyx_org_id uuid;
BEGIN
  SELECT id INTO ronyx_org_id
  FROM public.organizations
  WHERE organization_code = 'RONYX' OR lower(name) = 'ronyx'
  LIMIT 1;
  RAISE NOTICE 'Ronyx org_id = %', ronyx_org_id;
END $$;

-- ============================================================
-- SECTION 5: Add organization_id to every Ronyx operational table
-- ============================================================

-- aggregate_tickets (primary ticket table used by the app)
ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ronyx_trucks (truck fleet)
ALTER TABLE public.ronyx_trucks
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ronyx_customers
ALTER TABLE public.ronyx_customers
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- ronyx_loads
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_loads') THEN
    ALTER TABLE public.ronyx_loads ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- ronyx_invoices
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_invoices') THEN
    ALTER TABLE public.ronyx_invoices ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- ronyx_payroll_runs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_payroll_runs') THEN
    ALTER TABLE public.ronyx_payroll_runs ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- ronyx_payroll_items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_payroll_items') THEN
    ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- ronyx_owner_operators
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_owner_operators') THEN
    ALTER TABLE public.ronyx_owner_operators ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- drivers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
    ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- dispatch_jobs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dispatch_jobs') THEN
    ALTER TABLE public.dispatch_jobs ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- fast_scan_documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fast_scan_documents') THEN
    ALTER TABLE public.fast_scan_documents ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- fast_scan_audit_events
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fast_scan_audit_events') THEN
    ALTER TABLE public.fast_scan_audit_events ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- ticket_audit_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ticket_audit_log') THEN
    ALTER TABLE public.ticket_audit_log ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- driver_documents
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_documents') THEN
    ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- owner_operators (generic table, if exists alongside ronyx_owner_operators)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='owner_operators') THEN
    ALTER TABLE public.owner_operators ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- pit_invoices
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pit_invoices') THEN
    ALTER TABLE public.pit_invoices ADD COLUMN IF NOT EXISTS organization_id uuid;
  END IF;
END $$;

-- ============================================================
-- SECTION 6: Backfill organization_id = Ronyx org for all NULLs
-- ============================================================

DO $$
DECLARE
  ronyx_org_id uuid;
BEGIN
  SELECT id INTO ronyx_org_id
  FROM public.organizations
  WHERE organization_code = 'RONYX' OR lower(name) = 'ronyx'
  LIMIT 1;

  IF ronyx_org_id IS NULL THEN
    ronyx_org_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  RAISE NOTICE 'Backfilling with Ronyx org_id = %', ronyx_org_id;

  -- aggregate_tickets
  UPDATE public.aggregate_tickets SET organization_id = ronyx_org_id WHERE organization_id IS NULL;

  -- ronyx_trucks
  UPDATE public.ronyx_trucks SET organization_id = ronyx_org_id WHERE organization_id IS NULL;

  -- ronyx_customers
  UPDATE public.ronyx_customers SET organization_id = ronyx_org_id WHERE organization_id IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_loads') THEN
    EXECUTE 'UPDATE public.ronyx_loads SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_invoices') THEN
    EXECUTE 'UPDATE public.ronyx_invoices SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_payroll_runs') THEN
    EXECUTE 'UPDATE public.ronyx_payroll_runs SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_payroll_items') THEN
    EXECUTE 'UPDATE public.ronyx_payroll_items SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_owner_operators') THEN
    EXECUTE 'UPDATE public.ronyx_owner_operators SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
    EXECUTE 'UPDATE public.drivers SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dispatch_jobs') THEN
    EXECUTE 'UPDATE public.dispatch_jobs SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fast_scan_documents') THEN
    EXECUTE 'UPDATE public.fast_scan_documents SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fast_scan_audit_events') THEN
    EXECUTE 'UPDATE public.fast_scan_audit_events SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ticket_audit_log') THEN
    EXECUTE 'UPDATE public.ticket_audit_log SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_documents') THEN
    EXECUTE 'UPDATE public.driver_documents SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='owner_operators') THEN
    EXECUTE 'UPDATE public.owner_operators SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pit_invoices') THEN
    EXECUTE 'UPDATE public.pit_invoices SET organization_id = $1 WHERE organization_id IS NULL' USING ronyx_org_id;
  END IF;

  RAISE NOTICE 'Backfill complete. Ronyx org_id = %', ronyx_org_id;
END $$;

-- ============================================================
-- SECTION 7: Enable RLS + org-isolation policies
-- Service role bypasses RLS automatically in Supabase.
-- ============================================================

-- aggregate_tickets
ALTER TABLE public.aggregate_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tickets_org_isolation" ON public.aggregate_tickets;
CREATE POLICY "tickets_org_isolation" ON public.aggregate_tickets
  FOR ALL TO authenticated
  USING  (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

-- ronyx_trucks
ALTER TABLE public.ronyx_trucks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trucks_org_isolation" ON public.ronyx_trucks;
CREATE POLICY "trucks_org_isolation" ON public.ronyx_trucks
  FOR ALL TO authenticated
  USING  (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

-- ronyx_customers
ALTER TABLE public.ronyx_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_org_isolation" ON public.ronyx_customers;
CREATE POLICY "customers_org_isolation" ON public.ronyx_customers
  FOR ALL TO authenticated
  USING  (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

-- remaining tables via dynamic SQL
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ronyx_loads','ronyx_invoices','ronyx_payroll_runs','ronyx_payroll_items',
    'ronyx_owner_operators','drivers','dispatch_jobs','fast_scan_documents',
    'fast_scan_audit_events','ticket_audit_log','driver_documents',
    'owner_operators','pit_invoices'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "org_isolation" ON public.%I', t);
      EXECUTE format('
        CREATE POLICY "org_isolation" ON public.%I
          FOR ALL TO authenticated
          USING  (organization_id = public.current_user_org())
          WITH CHECK (organization_id = public.current_user_org())
      ', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- SECTION 8: Auto-set organization_id on INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_org_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.current_user_org();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aggregate_tickets','ronyx_trucks','ronyx_customers',
    'ronyx_loads','ronyx_invoices','ronyx_payroll_runs','ronyx_payroll_items',
    'ronyx_owner_operators','drivers','dispatch_jobs','fast_scan_documents',
    'fast_scan_audit_events','ticket_audit_log','driver_documents',
    'owner_operators','pit_invoices'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org_id ON public.%I', t);
      EXECUTE format('
        CREATE TRIGGER trg_set_org_id
          BEFORE INSERT ON public.%I
          FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user()
      ', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- SECTION 9: Indexes for query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_org ON public.aggregate_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_org      ON public.ronyx_trucks(organization_id);
CREATE INDEX IF NOT EXISTS idx_ronyx_customers_org   ON public.ronyx_customers(organization_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='drivers') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_drivers_org ON public.drivers(organization_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dispatch_jobs') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_org ON public.dispatch_jobs(organization_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='fast_scan_documents') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fsd_org ON public.fast_scan_documents(organization_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_loads') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ronyx_loads_org ON public.ronyx_loads(organization_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ronyx_invoices') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ronyx_invoices_org ON public.ronyx_invoices(organization_id)';
  END IF;
END $$;

-- ============================================================
-- SECTION 10: provision_new_org() — used by signup flow
-- Uses real organizations schema: organization_code, name, status
-- ============================================================

CREATE OR REPLACE FUNCTION public.provision_new_org(
  p_org_name        text,
  p_org_code        text,
  p_user_id         uuid,
  p_user_email      text,
  p_user_full_name  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  INSERT INTO public.organizations (name, organization_code, status, created_at)
  VALUES (p_org_name, upper(p_org_code), 'active', now())
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (id, organization_id, full_name, email, role, created_at)
  VALUES (p_user_id, v_org_id, p_user_full_name, p_user_email, 'owner', now())
  ON CONFLICT (id) DO UPDATE
    SET organization_id = EXCLUDED.organization_id,
        role = 'owner';

  INSERT INTO public.user_seats (user_id, organization_id, role, status)
  VALUES (p_user_id, v_org_id, 'owner', 'active')
  ON CONFLICT (user_id, organization_id) DO UPDATE
    SET role = 'owner', status = 'active';

  RETURN v_org_id;
END;
$$;

-- ============================================================
-- SECTION 11: Verification
-- ============================================================

DO $$
DECLARE
  ronyx_org_id uuid;
  ticket_count bigint;
  null_tickets bigint;
BEGIN
  SELECT id INTO ronyx_org_id
  FROM public.organizations
  WHERE organization_code = 'RONYX' OR lower(name) = 'ronyx'
  LIMIT 1;

  SELECT COUNT(*) INTO ticket_count FROM public.aggregate_tickets WHERE organization_id = ronyx_org_id;
  SELECT COUNT(*) INTO null_tickets FROM public.aggregate_tickets WHERE organization_id IS NULL;

  RAISE NOTICE '=== MIGRATION 165 COMPLETE ===';
  RAISE NOTICE 'Ronyx org_id: %', ronyx_org_id;
  RAISE NOTICE 'aggregate_tickets assigned to Ronyx: %', ticket_count;
  RAISE NOTICE 'aggregate_tickets still NULL: %', null_tickets;
  RAISE NOTICE 'Set RONYX_ORG_ID=% in .env.local', ronyx_org_id;
END $$;
