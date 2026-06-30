-- ============================================================================
-- Fast Scan™ — Proof-to-Pay workflow backend (Phase 3 spine).
-- Safe to run repeatedly (IF NOT EXISTS). Run in the Supabase SQL editor, then the
-- exception engine + reconciliation worktable (Phase 4) read from these.
-- Existing fast_scan_documents / fast_scan_audit_events tables are untouched.
-- ============================================================================

-- Scan batches (a scanning session — morning scale tickets, etc.)
CREATE TABLE IF NOT EXISTS scan_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  name text, scanner text, started_by text, started_at timestamptz DEFAULT now(),
  document_count int DEFAULT 0, scope_customer text, scope_job text, notes text,
  closeout_status text DEFAULT 'open', closed_by text, closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Expected tickets (what dispatch says SHOULD arrive — drives "Expected vs Received").
CREATE TABLE IF NOT EXISTS ticket_expectations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  expected_date date DEFAULT now(), ticket_number text, customer text, job text,
  truck_number text, driver_name text, material text, expected_qty numeric, qty_unit text,
  dispatch_load_id text, status text DEFAULT 'expected', received_document_id uuid,
  created_at timestamptz DEFAULT now()
);

-- The exception record (one per detected problem) — full shape from the spec.
CREATE TABLE IF NOT EXISTS document_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  ticket_id uuid, document_id uuid, ticket_number text,
  customer text, job text, truck_number text, driver_name text,
  exception_type text, severity text DEFAULT 'medium', status text DEFAULT 'open',
  financial_impact_billing numeric DEFAULT 0, financial_impact_payroll numeric DEFAULT 0,
  financial_impact_total numeric DEFAULT 0,
  assigned_to_user_id text, assigned_to_name text, assigned_at timestamptz, due_at timestamptz,
  waiting_on text, recommended_action text,
  resolution_code text, resolution_notes text, resolved_by_user_id text, resolved_at timestamptz,
  manager_approval_required boolean DEFAULT false, manager_approved_by text, manager_approved_at timestamptz,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- Routing decisions (where a cleared doc was sent).
CREATE TABLE IF NOT EXISTS document_routing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  document_id uuid, ticket_number text, document_type text,
  routed_to text, route_status text DEFAULT 'routed', routed_by text, created_at timestamptz DEFAULT now()
);

-- Duplicate detection results.
CREATE TABLE IF NOT EXISTS duplicate_detection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  document_id uuid, ticket_number text, match_document_id uuid, match_ticket_number text,
  match_confidence numeric, potential_billing numeric DEFAULT 0, potential_payroll numeric DEFAULT 0,
  resolution text, resolved_by text, created_at timestamptz DEFAULT now()
);

-- Rate override requests (approval workflow for rate mismatches).
CREATE TABLE IF NOT EXISTS rate_override_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  ticket_number text, document_id uuid, customer text, job text,
  scanned_rate numeric, rate_card_rate numeric, requested_rate numeric, difference numeric,
  reason text, requested_by text, status text DEFAULT 'pending',
  approved_by text, approved_at timestamptz, created_at timestamptz DEFAULT now()
);

-- Proof reminders sent to drivers / dispatch / customers.
CREATE TABLE IF NOT EXISTS proof_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  ticket_number text, document_id uuid, channel text, sent_to text, sent_by text,
  message text, created_at timestamptz DEFAULT now()
);

-- Free-text resolution notes on an exception.
CREATE TABLE IF NOT EXISTS proof_resolution_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  exception_id uuid, note text, created_by text, created_at timestamptz DEFAULT now()
);

-- Closeout snapshots (driver / truck / job / customer / batch).
CREATE TABLE IF NOT EXISTS ticket_closeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  closeout_date date DEFAULT now(), group_type text, group_name text,
  expected int DEFAULT 0, received int DEFAULT 0, cleared int DEFAULT 0, missing int DEFAULT 0,
  at_risk numeric DEFAULT 0, billing_value numeric DEFAULT 0, payroll_value numeric DEFAULT 0,
  status text DEFAULT 'open', closed_by text, closed_at timestamptz, created_at timestamptz DEFAULT now()
);

-- Full audit trail for every state change.
CREATE TABLE IF NOT EXISTS document_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  document_id uuid, exception_id uuid, ticket_number text, actor text,
  action text, previous_value text, new_value text, reason text, created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fs_exceptions_org ON document_exceptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_fs_exceptions_impact ON document_exceptions(financial_impact_total DESC);
CREATE INDEX IF NOT EXISTS idx_fs_expectations_org ON ticket_expectations(organization_id, expected_date);
CREATE INDEX IF NOT EXISTS idx_fs_batches_org ON scan_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_fs_audit_doc ON document_audit_events(document_id);

NOTIFY pgrst, 'reload schema';
