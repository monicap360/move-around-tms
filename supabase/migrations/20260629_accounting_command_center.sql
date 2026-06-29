-- ============================================================================
-- Accounting Command Center — complete data model.
-- Safe to run repeatedly (every statement uses IF NOT EXISTS).
-- After running, reload the API:  NOTIFY pgrst, 'reload schema';
-- ============================================================================

-- 1. Financial periods (locking)
CREATE TABLE IF NOT EXISTS financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  name text, start_date date, end_date date, status text DEFAULT 'open',
  locked_by text, locked_at timestamptz, created_at timestamptz DEFAULT now()
);

-- 2. Financial exceptions queue
CREATE TABLE IF NOT EXISTS financial_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  exception_type text, priority text, customer text, job text, ref text, truck text,
  party text, financial_impact numeric DEFAULT 0, impact_label text, age_days int DEFAULT 0,
  assigned_to text, recommended_action text, status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- 3. Per-ticket financial record + rate validation
CREATE TABLE IF NOT EXISTS ticket_financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  ticket_id uuid, ticket_number text, customer text, job text,
  revenue numeric DEFAULT 0, cost numeric DEFAULT 0, fuel numeric DEFAULT 0,
  pit numeric DEFAULT 0, other numeric DEFAULT 0, margin numeric DEFAULT 0,
  confidence text, invoice_status text DEFAULT 'needs_review', payment_status text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ticket_rate_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  ticket_id uuid, customer_rate numeric, validated boolean DEFAULT false,
  validated_by text, validated_at timestamptz, created_at timestamptz DEFAULT now()
);

-- 4. Rate cards
CREATE TABLE IF NOT EXISTS customer_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  customer_name text, material text, rate numeric, rate_type text DEFAULT 'per_ton',
  min_margin numeric, effective_date date, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  job text, customer text, rate numeric, rate_type text DEFAULT 'per_ton',
  effective_date date, created_at timestamptz DEFAULT now()
);

-- 5. Invoices, lines, payments, credit memos
CREATE TABLE IF NOT EXISTS customer_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  invoice_number text, customer_name text, customer_id uuid, job text,
  invoice_date date DEFAULT now(), due_date date,
  original_amount numeric DEFAULT 0, amount_paid numeric DEFAULT 0,
  status text DEFAULT 'open', dispute_status text, credit_hold boolean DEFAULT false,
  ticket_numbers jsonb, ticket_count int DEFAULT 0, purchase_order text,
  created_by text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid,
  ticket_number text, description text, quantity numeric, rate numeric, amount numeric,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid,
  amount numeric DEFAULT 0, paid_at date DEFAULT now(), method text, reference text,
  recorded_by text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS credit_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  invoice_id uuid, customer_name text, amount numeric DEFAULT 0, reason text,
  created_by text, created_at timestamptz DEFAULT now()
);

-- 6. Driver payroll
CREATE TABLE IF NOT EXISTS driver_pay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  driver_id uuid, driver_name text, pay_period text,
  loads numeric DEFAULT 0, tons numeric DEFAULT 0, hours numeric DEFAULT 0,
  base_pay numeric DEFAULT 0, overtime numeric DEFAULT 0, bonus numeric DEFAULT 0,
  reimbursements numeric DEFAULT 0, deductions numeric DEFAULT 0,
  gross_pay numeric DEFAULT 0, net_pay numeric DEFAULT 0, ticket_count int DEFAULT 0,
  approval_status text DEFAULT 'draft', export_status text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS driver_pay_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pay_run_id uuid,
  ticket_number text, line_type text, amount numeric DEFAULT 0, created_at timestamptz DEFAULT now()
);

-- 7. Owner-operator settlements
CREATE TABLE IF NOT EXISTS owner_operator_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  oo_id uuid, company_name text, settlement_period text, loads numeric DEFAULT 0,
  gross_revenue numeric DEFAULT 0, agreed_pay numeric DEFAULT 0,
  fuel_deductions numeric DEFAULT 0, insurance_deductions numeric DEFAULT 0,
  trailer_deductions numeric DEFAULT 0, advances numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0, reimbursements numeric DEFAULT 0,
  net_settlement numeric DEFAULT 0, compliance_status text, approval_status text DEFAULT 'draft',
  payment_status text, blocks jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS owner_operator_settlement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), settlement_id uuid,
  ticket_number text, line_type text, amount numeric DEFAULT 0, created_at timestamptz DEFAULT now()
);

-- 8. Adjustments (never delete posted records)
CREATE TABLE IF NOT EXISTS financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  record_type text, record_id uuid, record_number text,
  original_amount numeric, revised_amount numeric, reason text,
  requested_by text, approved_by text, affected_ref text, memo_type text,
  created_at timestamptz DEFAULT now()
);

-- 9. Fuel + cost allocation
CREATE TABLE IF NOT EXISTS fuel_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  transaction_date date, vendor text, cost_type text, amount numeric DEFAULT 0,
  truck_number text, party text, job text, ticket_number text,
  allocation_method text, status text DEFAULT 'unmatched', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  cost_id uuid, cost_type text, method text, truck_number text, job text,
  amount numeric DEFAULT 0, created_at timestamptz DEFAULT now()
);

-- 10. Job cost snapshots
CREATE TABLE IF NOT EXISTS job_cost_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  customer text, job text, loads numeric DEFAULT 0, tons numeric DEFAULT 0,
  revenue numeric DEFAULT 0, oo_cost numeric DEFAULT 0, fuel_cost numeric DEFAULT 0,
  pit_cost numeric DEFAULT 0, maintenance numeric DEFAULT 0, other_cost numeric DEFAULT 0,
  gross_margin numeric DEFAULT 0, margin_status text, snapshot_date date DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 11. Customer credit + collections
CREATE TABLE IF NOT EXISTS customer_credit_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  customer_name text, credit_limit numeric DEFAULT 0, credit_used numeric DEFAULT 0,
  avg_days_to_pay int, on_credit_hold boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collection_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  customer_name text, invoice_id uuid, note text, promise_to_pay date,
  created_by text, created_at timestamptz DEFAULT now()
);

-- 12. Exports + sync logs
CREATE TABLE IF NOT EXISTS accounting_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  export_type text, source_ref text, source_id uuid, record_count int DEFAULT 0,
  amount numeric DEFAULT 0, status text DEFAULT 'ready', external_ref text,
  exported_at timestamptz, exported_by text, sync_error text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS accounting_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  export_id uuid, action text, status text, message text, created_at timestamptz DEFAULT now()
);

-- 13. Financial audit trail
CREATE TABLE IF NOT EXISTS financial_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  user_name text, module text, record_type text, record_number text, action text,
  previous_value text, new_value text, reason text, approval_status text,
  linked_ref text, created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_customer_invoices_org ON customer_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_inv ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_oo_settlements_org ON owner_operator_settlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_tx_org ON fuel_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_driver_pay_org ON driver_pay_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_exceptions_org ON financial_exceptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_org ON financial_audit_events(organization_id);

-- Reload the API layer so it sees the new tables
NOTIFY pgrst, 'reload schema';
