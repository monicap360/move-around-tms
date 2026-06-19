-- ============================================================
-- Migration 173: Create tables referenced by API routes
--               that have no migration yet.
--
-- ronyx_invoice_items  — referenced by app/api/ronyx/invoices/route.ts
-- ronyx_payroll_items  — referenced by app/api/ronyx/payroll/runs/route.ts
--                        and app/api/ronyx/quickbooks/export/route.ts
--
-- All statements use IF NOT EXISTS. Safe to re-run.
-- ============================================================


-- ------------------------------------------------------------
-- 1. ronyx_invoice_items
--    Line items for customer invoices.
--    Linked from ronyx_invoices via invoice_id.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ronyx_invoice_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid        NOT NULL REFERENCES public.ronyx_invoices(id) ON DELETE CASCADE,
  ticket_id         uuid,
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  description       text,
  quantity          numeric(12,4) DEFAULT 1,
  unit              text          DEFAULT 'Load',
  unit_price        numeric(12,2) DEFAULT 0,
  total_amount      numeric(12,2) DEFAULT 0,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rii_invoice   ON public.ronyx_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_rii_ticket    ON public.ronyx_invoice_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rii_org       ON public.ronyx_invoice_items(organization_id);

ALTER TABLE public.ronyx_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rii_select" ON public.ronyx_invoice_items;
DROP POLICY IF EXISTS "rii_insert" ON public.ronyx_invoice_items;
DROP POLICY IF EXISTS "rii_update" ON public.ronyx_invoice_items;
DROP POLICY IF EXISTS "rii_delete" ON public.ronyx_invoice_items;

CREATE POLICY "rii_select" ON public.ronyx_invoice_items
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "rii_insert" ON public.ronyx_invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rii_update" ON public.ronyx_invoice_items
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rii_delete" ON public.ronyx_invoice_items
  FOR DELETE TO authenticated
  USING (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 2. ronyx_payroll_items
--    Per-driver pay line items for a payroll run.
--    Referenced by payroll/runs route and QuickBooks export.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ronyx_payroll_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid,                             -- FK added after run table exists
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id         uuid,
  driver_name       text,
  pay_type          text        DEFAULT 'regular',    -- regular | overtime | bonus | deduction
  description       text,
  hours             numeric(10,2),
  rate              numeric(10,2),
  gross_pay         numeric(12,2) DEFAULT 0,
  deductions        numeric(12,2) DEFAULT 0,
  net_pay           numeric(12,2) DEFAULT 0,
  ticket_ids        uuid[]      DEFAULT ARRAY[]::uuid[],
  status            text        DEFAULT 'pending',
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rpi_run_id    ON public.ronyx_payroll_items(run_id);
CREATE INDEX IF NOT EXISTS idx_rpi_driver    ON public.ronyx_payroll_items(driver_id);
CREATE INDEX IF NOT EXISTS idx_rpi_org       ON public.ronyx_payroll_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_rpi_status    ON public.ronyx_payroll_items(status);

ALTER TABLE public.ronyx_payroll_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rpi_select" ON public.ronyx_payroll_items;
DROP POLICY IF EXISTS "rpi_insert" ON public.ronyx_payroll_items;
DROP POLICY IF EXISTS "rpi_update" ON public.ronyx_payroll_items;

CREATE POLICY "rpi_select" ON public.ronyx_payroll_items
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "rpi_insert" ON public.ronyx_payroll_items
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rpi_update" ON public.ronyx_payroll_items
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 3. Validate
-- ------------------------------------------------------------

SELECT table_name, 'exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ronyx_invoice_items', 'ronyx_payroll_items')
ORDER BY table_name;
