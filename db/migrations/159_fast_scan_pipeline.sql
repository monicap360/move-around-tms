-- ============================================================
-- MIGRATION 159
-- Fast Scan Ticket / Invoice / Payroll Pipeline
-- For MoveAround TMS / Ronyx
--
-- Depends on:
--   158_org_storage_buckets.sql
--
-- Purpose:
--   Connect scanned tickets, invoice uploads, Excel uploads,
--   reconciliation results, payroll holds, and billing readiness.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extensions
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 2. Ensure helper function exists
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- 3. Updated-at helper
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4. Fast Scan batches
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fast_scan_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  batch_number text,
  batch_type text NOT NULL DEFAULT 'ticket_scan',

  source text NOT NULL DEFAULT 'manual_upload',
  upload_count integer NOT NULL DEFAULT 0,

  status text NOT NULL DEFAULT 'uploaded',

  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fast_scan_batches_batch_type_check CHECK (
    batch_type IN (
      'ticket_scan',
      'pit_invoice',
      'excel_master',
      'payroll_packet',
      'settlement_packet',
      'mixed'
    )
  ),

  CONSTRAINT fast_scan_batches_status_check CHECK (
    status IN (
      'uploaded',
      'processing',
      'needs_review',
      'partially_matched',
      'matched',
      'approved',
      'rejected',
      'archived'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_fast_scan_batches_org
ON public.fast_scan_batches (organization_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_batches_status
ON public.fast_scan_batches (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_fast_scan_batches_created
ON public.fast_scan_batches (organization_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_fast_scan_batches_updated_at ON public.fast_scan_batches;

CREATE TRIGGER trg_fast_scan_batches_updated_at
BEFORE UPDATE ON public.fast_scan_batches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 5. Fast Scan documents
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fast_scan_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  batch_id uuid REFERENCES public.fast_scan_batches(id) ON DELETE SET NULL,

  -- Optional link to tms_document_files if that table exists
  document_file_id uuid,

  document_kind text NOT NULL DEFAULT 'ticket',

  bucket_id text,
  object_path text,

  original_filename text,
  page_count integer,

  scan_status text NOT NULL DEFAULT 'uploaded',
  ocr_status text NOT NULL DEFAULT 'pending',
  review_status text NOT NULL DEFAULT 'not_reviewed',

  confidence_score numeric(5,2),

  raw_ocr_text text,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,

  ticket_number text,
  ticket_date date,

  customer_name text,
  project_name text,
  project_id uuid,

  vendor_name text,
  pit_name text,
  material text,

  truck_number text,
  trailer_number text,
  driver_name text,
  driver_id uuid,

  quantity numeric(12,2),
  quantity_unit text,

  gross_weight numeric(12,2),
  tare_weight numeric(12,2),
  net_weight numeric(12,2),

  rate numeric(12,4),
  amount numeric(12,2),

  has_driver_signature boolean DEFAULT false,
  has_pit_signature boolean DEFAULT false,
  has_required_proof boolean DEFAULT false,

  payroll_status text NOT NULL DEFAULT 'not_ready',
  billing_status text NOT NULL DEFAULT 'not_ready',

  hold_reason text,
  correction_note text,

  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,

  created_by uuid REFERENCES auth.users(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fast_scan_documents_document_kind_check CHECK (
    document_kind IN (
      'ticket',
      'pit_invoice',
      'excel_master',
      'payroll_packet',
      'settlement_packet',
      'proof',
      'other'
    )
  ),

  CONSTRAINT fast_scan_documents_scan_status_check CHECK (
    scan_status IN (
      'uploaded',
      'processing',
      'processed',
      'failed',
      'needs_review',
      'approved',
      'rejected',
      'archived'
    )
  ),

  CONSTRAINT fast_scan_documents_ocr_status_check CHECK (
    ocr_status IN (
      'pending',
      'processing',
      'completed',
      'failed',
      'needs_review',
      'not_required'
    )
  ),

  CONSTRAINT fast_scan_documents_review_status_check CHECK (
    review_status IN (
      'not_reviewed',
      'needs_review',
      'in_review',
      'approved',
      'rejected'
    )
  ),

  CONSTRAINT fast_scan_documents_payroll_status_check CHECK (
    payroll_status IN (
      'not_ready',
      'ready',
      'on_hold',
      'sent_to_payroll',
      'paid',
      'excluded'
    )
  ),

  CONSTRAINT fast_scan_documents_billing_status_check CHECK (
    billing_status IN (
      'not_ready',
      'ready',
      'sent_to_billing',
      'invoiced',
      'excluded'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_org
ON public.fast_scan_documents (organization_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_batch
ON public.fast_scan_documents (batch_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_ticket
ON public.fast_scan_documents (organization_id, ticket_number);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_driver
ON public.fast_scan_documents (organization_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_project
ON public.fast_scan_documents (organization_id, project_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_review
ON public.fast_scan_documents (organization_id, review_status);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_payroll
ON public.fast_scan_documents (organization_id, payroll_status);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_billing
ON public.fast_scan_documents (organization_id, billing_status);

CREATE INDEX IF NOT EXISTS idx_fast_scan_documents_created
ON public.fast_scan_documents (organization_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_fast_scan_documents_updated_at ON public.fast_scan_documents;

CREATE TRIGGER trg_fast_scan_documents_updated_at
BEFORE UPDATE ON public.fast_scan_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 6. Fast Scan reconciliation results
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fast_scan_reconciliation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  fast_scan_document_id uuid NOT NULL REFERENCES public.fast_scan_documents(id) ON DELETE CASCADE,

  match_type text NOT NULL,
  match_status text NOT NULL DEFAULT 'pending',

  matched_entity_type text,
  matched_entity_id uuid,

  ticket_number text,
  invoice_number text,
  excel_row_number integer,

  expected_quantity numeric(12,2),
  scanned_quantity numeric(12,2),
  quantity_difference numeric(12,2),

  expected_amount numeric(12,2),
  scanned_amount numeric(12,2),
  amount_difference numeric(12,2),

  confidence_score numeric(5,2),

  issue_severity text NOT NULL DEFAULT 'none',
  issue_code text,
  issue_message text,

  suggested_action text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fast_scan_reconciliation_match_type_check CHECK (
    match_type IN (
      'ticket_to_invoice',
      'ticket_to_excel',
      'invoice_to_excel',
      'ticket_to_payroll',
      'ticket_duplicate_check',
      'manual_review'
    )
  ),

  CONSTRAINT fast_scan_reconciliation_match_status_check CHECK (
    match_status IN (
      'pending',
      'matched',
      'partial_match',
      'mismatch',
      'missing_ticket',
      'duplicate',
      'needs_review',
      'resolved',
      'ignored'
    )
  ),

  CONSTRAINT fast_scan_reconciliation_issue_severity_check CHECK (
    issue_severity IN (
      'none',
      'low',
      'medium',
      'high',
      'critical'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_fast_scan_recon_org
ON public.fast_scan_reconciliation_results (organization_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_recon_document
ON public.fast_scan_reconciliation_results (fast_scan_document_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_recon_status
ON public.fast_scan_reconciliation_results (organization_id, match_status);

CREATE INDEX IF NOT EXISTS idx_fast_scan_recon_type
ON public.fast_scan_reconciliation_results (organization_id, match_type);

CREATE INDEX IF NOT EXISTS idx_fast_scan_recon_severity
ON public.fast_scan_reconciliation_results (organization_id, issue_severity);

DROP TRIGGER IF EXISTS trg_fast_scan_recon_updated_at ON public.fast_scan_reconciliation_results;

CREATE TRIGGER trg_fast_scan_recon_updated_at
BEFORE UPDATE ON public.fast_scan_reconciliation_results
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 7. Fast Scan payroll routing / holds
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fast_scan_payroll_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  fast_scan_document_id uuid NOT NULL REFERENCES public.fast_scan_documents(id) ON DELETE CASCADE,

  driver_id uuid,
  payroll_item_id uuid,

  ticket_number text,
  work_date date,

  pay_type text NOT NULL DEFAULT 'ticket',
  pay_status text NOT NULL DEFAULT 'pending_review',

  quantity numeric(12,2),
  quantity_unit text,
  rate numeric(12,4),
  gross_pay numeric(12,2),

  deductions numeric(12,2) NOT NULL DEFAULT 0,
  reimbursements numeric(12,2) NOT NULL DEFAULT 0,
  net_pay numeric(12,2),

  hold_pay boolean NOT NULL DEFAULT false,
  hold_reason text,

  proof_required boolean NOT NULL DEFAULT true,
  proof_received boolean NOT NULL DEFAULT false,

  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,

  sent_to_payroll_at timestamptz,
  paid_at timestamptz,

  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fast_scan_payroll_routes_pay_type_check CHECK (
    pay_type IN (
      'ticket',
      'load',
      'hourly',
      'tonnage',
      'reimbursement',
      'deduction',
      'adjustment'
    )
  ),

  CONSTRAINT fast_scan_payroll_routes_pay_status_check CHECK (
    pay_status IN (
      'pending_review',
      'ready',
      'on_hold',
      'approved',
      'sent_to_payroll',
      'paid',
      'voided'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_fast_scan_payroll_routes_org
ON public.fast_scan_payroll_routes (organization_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_payroll_routes_document
ON public.fast_scan_payroll_routes (fast_scan_document_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_payroll_routes_driver
ON public.fast_scan_payroll_routes (organization_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_payroll_routes_status
ON public.fast_scan_payroll_routes (organization_id, pay_status);

CREATE INDEX IF NOT EXISTS idx_fast_scan_payroll_routes_hold
ON public.fast_scan_payroll_routes (organization_id, hold_pay);

DROP TRIGGER IF EXISTS trg_fast_scan_payroll_routes_updated_at ON public.fast_scan_payroll_routes;

CREATE TRIGGER trg_fast_scan_payroll_routes_updated_at
BEFORE UPDATE ON public.fast_scan_payroll_routes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 8. Fast Scan audit trail
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fast_scan_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  fast_scan_document_id uuid REFERENCES public.fast_scan_documents(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.fast_scan_batches(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  event_note text,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  actor_id uuid REFERENCES auth.users(id),

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fast_scan_audit_events_type_check CHECK (
    event_type IN (
      'uploaded',
      'ocr_started',
      'ocr_completed',
      'ocr_failed',
      'field_corrected',
      'matched',
      'mismatch_found',
      'review_requested',
      'approved',
      'rejected',
      'payroll_hold_created',
      'payroll_hold_released',
      'sent_to_payroll',
      'sent_to_billing',
      'invoice_matched',
      'excel_reconciled',
      'note_added'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_fast_scan_audit_org
ON public.fast_scan_audit_events (organization_id);

CREATE INDEX IF NOT EXISTS idx_fast_scan_audit_document
ON public.fast_scan_audit_events (fast_scan_document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fast_scan_audit_batch
ON public.fast_scan_audit_events (batch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fast_scan_audit_type
ON public.fast_scan_audit_events (organization_id, event_type, created_at DESC);

-- ------------------------------------------------------------
-- 9. RLS
-- ------------------------------------------------------------

ALTER TABLE public.fast_scan_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fast_scan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fast_scan_reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fast_scan_payroll_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fast_scan_audit_events ENABLE ROW LEVEL SECURITY;

-- Batches

DROP POLICY IF EXISTS "fast_scan_batches_select_org" ON public.fast_scan_batches;
DROP POLICY IF EXISTS "fast_scan_batches_insert_org" ON public.fast_scan_batches;
DROP POLICY IF EXISTS "fast_scan_batches_update_org" ON public.fast_scan_batches;
DROP POLICY IF EXISTS "fast_scan_batches_delete_org" ON public.fast_scan_batches;

CREATE POLICY "fast_scan_batches_select_org"
ON public.fast_scan_batches FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_batches_insert_org"
ON public.fast_scan_batches FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_batches_update_org"
ON public.fast_scan_batches FOR UPDATE TO authenticated
USING (organization_id = public.current_user_org())
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_batches_delete_org"
ON public.fast_scan_batches FOR DELETE TO authenticated
USING (organization_id = public.current_user_org());

-- Documents

DROP POLICY IF EXISTS "fast_scan_documents_select_org" ON public.fast_scan_documents;
DROP POLICY IF EXISTS "fast_scan_documents_insert_org" ON public.fast_scan_documents;
DROP POLICY IF EXISTS "fast_scan_documents_update_org" ON public.fast_scan_documents;
DROP POLICY IF EXISTS "fast_scan_documents_delete_org" ON public.fast_scan_documents;

CREATE POLICY "fast_scan_documents_select_org"
ON public.fast_scan_documents FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_documents_insert_org"
ON public.fast_scan_documents FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_documents_update_org"
ON public.fast_scan_documents FOR UPDATE TO authenticated
USING (organization_id = public.current_user_org())
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_documents_delete_org"
ON public.fast_scan_documents FOR DELETE TO authenticated
USING (organization_id = public.current_user_org());

-- Reconciliation

DROP POLICY IF EXISTS "fast_scan_recon_select_org" ON public.fast_scan_reconciliation_results;
DROP POLICY IF EXISTS "fast_scan_recon_insert_org" ON public.fast_scan_reconciliation_results;
DROP POLICY IF EXISTS "fast_scan_recon_update_org" ON public.fast_scan_reconciliation_results;
DROP POLICY IF EXISTS "fast_scan_recon_delete_org" ON public.fast_scan_reconciliation_results;

CREATE POLICY "fast_scan_recon_select_org"
ON public.fast_scan_reconciliation_results FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_recon_insert_org"
ON public.fast_scan_reconciliation_results FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_recon_update_org"
ON public.fast_scan_reconciliation_results FOR UPDATE TO authenticated
USING (organization_id = public.current_user_org())
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_recon_delete_org"
ON public.fast_scan_reconciliation_results FOR DELETE TO authenticated
USING (organization_id = public.current_user_org());

-- Payroll routes

DROP POLICY IF EXISTS "fast_scan_payroll_routes_select_org" ON public.fast_scan_payroll_routes;
DROP POLICY IF EXISTS "fast_scan_payroll_routes_insert_org" ON public.fast_scan_payroll_routes;
DROP POLICY IF EXISTS "fast_scan_payroll_routes_update_org" ON public.fast_scan_payroll_routes;
DROP POLICY IF EXISTS "fast_scan_payroll_routes_delete_org" ON public.fast_scan_payroll_routes;

CREATE POLICY "fast_scan_payroll_routes_select_org"
ON public.fast_scan_payroll_routes FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_payroll_routes_insert_org"
ON public.fast_scan_payroll_routes FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_payroll_routes_update_org"
ON public.fast_scan_payroll_routes FOR UPDATE TO authenticated
USING (organization_id = public.current_user_org())
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_payroll_routes_delete_org"
ON public.fast_scan_payroll_routes FOR DELETE TO authenticated
USING (organization_id = public.current_user_org());

-- Audit events

DROP POLICY IF EXISTS "fast_scan_audit_events_select_org" ON public.fast_scan_audit_events;
DROP POLICY IF EXISTS "fast_scan_audit_events_insert_org" ON public.fast_scan_audit_events;
DROP POLICY IF EXISTS "fast_scan_audit_events_update_org" ON public.fast_scan_audit_events;
DROP POLICY IF EXISTS "fast_scan_audit_events_delete_org" ON public.fast_scan_audit_events;

CREATE POLICY "fast_scan_audit_events_select_org"
ON public.fast_scan_audit_events FOR SELECT TO authenticated
USING (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_audit_events_insert_org"
ON public.fast_scan_audit_events FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_audit_events_update_org"
ON public.fast_scan_audit_events FOR UPDATE TO authenticated
USING (organization_id = public.current_user_org())
WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "fast_scan_audit_events_delete_org"
ON public.fast_scan_audit_events FOR DELETE TO authenticated
USING (organization_id = public.current_user_org());

-- ------------------------------------------------------------
-- 10. Service role full access
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "service_role_fast_scan_batches_full_access" ON public.fast_scan_batches;
DROP POLICY IF EXISTS "service_role_fast_scan_documents_full_access" ON public.fast_scan_documents;
DROP POLICY IF EXISTS "service_role_fast_scan_recon_full_access" ON public.fast_scan_reconciliation_results;
DROP POLICY IF EXISTS "service_role_fast_scan_payroll_routes_full_access" ON public.fast_scan_payroll_routes;
DROP POLICY IF EXISTS "service_role_fast_scan_audit_events_full_access" ON public.fast_scan_audit_events;

CREATE POLICY "service_role_fast_scan_batches_full_access"
ON public.fast_scan_batches FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_fast_scan_documents_full_access"
ON public.fast_scan_documents FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_fast_scan_recon_full_access"
ON public.fast_scan_reconciliation_results FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_fast_scan_payroll_routes_full_access"
ON public.fast_scan_payroll_routes FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role_fast_scan_audit_events_full_access"
ON public.fast_scan_audit_events FOR ALL TO service_role
USING (true) WITH CHECK (true);
