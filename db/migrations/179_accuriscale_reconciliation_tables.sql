-- ============================================================
-- Migration 179: AccuriScale Intelligence™ — Reconciliation Tables
--
-- Connects AccuriScale to payroll, billing, invoice matching,
-- and revenue recovery tracking.
-- Requires migration 178 (core tables) to be run first.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================


-- ─── 1. accuriscale_invoice_reconciliation ────────────────────────────────────
-- Tracks the proof chain from scale ticket → customer invoice.

CREATE TABLE IF NOT EXISTS public.accuriscale_invoice_reconciliation (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scale_ticket_id           uuid          REFERENCES public.accuriscale_scale_tickets(id) ON DELETE SET NULL,
  load_id                   uuid          REFERENCES public.accuriscale_loads(id) ON DELETE SET NULL,
  invoice_id                uuid,                            -- FK to invoices table when available
  customer_id               uuid,
  project_id                uuid,
  ticket_tons               numeric(10,3),
  ticket_rate               numeric(10,4),
  ticket_amount             numeric(12,2) GENERATED ALWAYS AS (ticket_tons * ticket_rate) STORED,
  invoice_tons              numeric(10,3),
  invoice_rate              numeric(10,4),
  invoice_amount            numeric(12,2),
  variance_amount           numeric(12,2) GENERATED ALWAYS AS (
    COALESCE(invoice_amount, 0) - COALESCE(ticket_tons * ticket_rate, 0)
  ) STORED,
  reconciliation_status     text          NOT NULL DEFAULT 'not_billed'
    CHECK (reconciliation_status IN (
      'ready_to_bill','billing_hold','invoiced','paid',
      'invoice_mismatch','unbilled','duplicate_billing','dispute'
    )),
  billing_hold_reason       text,
  hold_resolved_at          timestamptz,
  hold_resolved_by          text,
  notes                     text,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asir_org      ON public.accuriscale_invoice_reconciliation(organization_id);
CREATE INDEX IF NOT EXISTS idx_asir_ticket   ON public.accuriscale_invoice_reconciliation(scale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_asir_status   ON public.accuriscale_invoice_reconciliation(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_asir_customer ON public.accuriscale_invoice_reconciliation(customer_id);

ALTER TABLE public.accuriscale_invoice_reconciliation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asir_select" ON public.accuriscale_invoice_reconciliation;
DROP POLICY IF EXISTS "asir_insert" ON public.accuriscale_invoice_reconciliation;
DROP POLICY IF EXISTS "asir_update" ON public.accuriscale_invoice_reconciliation;
CREATE POLICY "asir_select" ON public.accuriscale_invoice_reconciliation FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asir_insert" ON public.accuriscale_invoice_reconciliation FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asir_update" ON public.accuriscale_invoice_reconciliation FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 2. accuriscale_payroll_reconciliation ────────────────────────────────────
-- Tracks the proof chain from scale ticket → driver payroll line.

CREATE TABLE IF NOT EXISTS public.accuriscale_payroll_reconciliation (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scale_ticket_id           uuid          REFERENCES public.accuriscale_scale_tickets(id) ON DELETE SET NULL,
  load_id                   uuid          REFERENCES public.accuriscale_loads(id) ON DELETE SET NULL,
  payroll_item_id           uuid,                            -- FK to payroll_items when available
  driver_id                 uuid,
  truck_id                  uuid,
  ticket_tons               numeric(10,3),
  pay_rate                  numeric(10,4),
  expected_pay_amount       numeric(12,2) GENERATED ALWAYS AS (ticket_tons * pay_rate) STORED,
  actual_pay_amount         numeric(12,2),
  variance_amount           numeric(12,2) GENERATED ALWAYS AS (
    COALESCE(actual_pay_amount, 0) - COALESCE(ticket_tons * pay_rate, 0)
  ) STORED,
  payroll_status            text          NOT NULL DEFAULT 'not_paid'
    CHECK (payroll_status IN (
      'ready_for_payroll','payroll_hold','sent_to_payroll',
      'paid','pay_mismatch','missing_ticket_proof','overpayment_risk'
    )),
  payroll_hold_reason       text,
  hold_resolved_at          timestamptz,
  hold_resolved_by          text,
  notes                     text,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aspr_org     ON public.accuriscale_payroll_reconciliation(organization_id);
CREATE INDEX IF NOT EXISTS idx_aspr_ticket  ON public.accuriscale_payroll_reconciliation(scale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_aspr_driver  ON public.accuriscale_payroll_reconciliation(driver_id);
CREATE INDEX IF NOT EXISTS idx_aspr_status  ON public.accuriscale_payroll_reconciliation(payroll_status);

ALTER TABLE public.accuriscale_payroll_reconciliation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aspr_select" ON public.accuriscale_payroll_reconciliation;
DROP POLICY IF EXISTS "aspr_insert" ON public.accuriscale_payroll_reconciliation;
DROP POLICY IF EXISTS "aspr_update" ON public.accuriscale_payroll_reconciliation;
CREATE POLICY "aspr_select" ON public.accuriscale_payroll_reconciliation FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "aspr_insert" ON public.accuriscale_payroll_reconciliation FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "aspr_update" ON public.accuriscale_payroll_reconciliation FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 3. accuriscale_revenue_recovery ─────────────────────────────────────────
-- Tracks money caught and recovered by AccuriScale.
-- This is the product's ROI proof table.

CREATE TABLE IF NOT EXISTS public.accuriscale_revenue_recovery (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recovery_type         text          NOT NULL
    CHECK (recovery_type IN (
      'short_load_recovery',
      'missed_accessorial',
      'rate_correction',
      'duplicate_billing_prevented',
      'unbilled_ticket_found',
      'payroll_overpayment_prevented',
      'invoice_mismatch_corrected',
      'missing_ticket_proof_required'
    )),
  load_id               uuid          REFERENCES public.accuriscale_loads(id) ON DELETE SET NULL,
  scale_ticket_id       uuid          REFERENCES public.accuriscale_scale_tickets(id) ON DELETE SET NULL,
  exception_id          uuid          REFERENCES public.accuriscale_exceptions(id) ON DELETE SET NULL,
  amount_recovered      numeric(12,2) NOT NULL DEFAULT 0,
  description           text,
  status                text          NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified','confirmed','collected','waived')),
  resolved_at           timestamptz,
  resolved_by           text,
  notes                 text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asrr_org    ON public.accuriscale_revenue_recovery(organization_id);
CREATE INDEX IF NOT EXISTS idx_asrr_type   ON public.accuriscale_revenue_recovery(recovery_type);
CREATE INDEX IF NOT EXISTS idx_asrr_status ON public.accuriscale_revenue_recovery(status);

ALTER TABLE public.accuriscale_revenue_recovery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asrr_select" ON public.accuriscale_revenue_recovery;
DROP POLICY IF EXISTS "asrr_insert" ON public.accuriscale_revenue_recovery;
DROP POLICY IF EXISTS "asrr_update" ON public.accuriscale_revenue_recovery;
CREATE POLICY "asrr_select" ON public.accuriscale_revenue_recovery FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asrr_insert" ON public.accuriscale_revenue_recovery FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asrr_update" ON public.accuriscale_revenue_recovery FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── Validate ────────────────────────────────────────────────────────────────

SELECT table_name, 'created' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accuriscale_invoice_reconciliation',
    'accuriscale_payroll_reconciliation',
    'accuriscale_revenue_recovery'
  )
ORDER BY table_name;

-- Check computed columns exist
SELECT column_name, is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('accuriscale_invoice_reconciliation','accuriscale_payroll_reconciliation')
  AND column_name IN ('ticket_amount','variance_amount','expected_pay_amount')
ORDER BY table_name, column_name;
