-- Migration 156: Invoice Command Center tables
-- Supports dual-lane billing: Customer Invoices + Payroll Invoices / Contractor Pay Sheets

CREATE TABLE IF NOT EXISTS public.invoice_ticket_imports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_name       text,
  source_type       text,       -- erocks | payroll_sheet | pit_portal | fast_scan | manual
  file_name         text,
  original_upload_id uuid       REFERENCES public.original_uploads(id) ON DELETE SET NULL,
  imported_by       uuid,
  imported_at       timestamptz DEFAULT now(),
  status            text        DEFAULT 'imported',
  notes             text,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_ticket_rows (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  import_id                 uuid        REFERENCES public.invoice_ticket_imports(id) ON DELETE CASCADE,

  source_sheet_name         text,
  source_row_number         integer,

  contractor_name           text,
  truck_number              text,
  ticket_date               date,
  ticket_number             text,
  job_name                  text,
  job_description           text,
  qty                       numeric,
  haul_rate                 numeric,
  full_rate                 numeric,
  ticket_value              numeric,    -- calculated: qty * full_rate
  void_status               text,       -- null | void | excluded
  job_number                text,
  notes                     text,

  -- Payroll calc fields
  lewis_percent             numeric,
  contractor_percent        numeric,    -- C %
  c_truck_total             numeric,    -- ticket_value * contractor_percent
  payout_rate               numeric,
  payout                    numeric,

  -- Invoice lifecycle
  customer_invoice_status   text        DEFAULT 'not_ready',  -- not_ready | ready | invoiced | paid
  payroll_invoice_status    text        DEFAULT 'not_ready',  -- not_ready | ready | generated | paid
  reconciliation_status     text        DEFAULT 'needs_review', -- needs_review | matched | exception | voided

  raw_row                   jsonb       DEFAULT '{}'::jsonb,
  created_at                timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_org         ON public.invoice_ticket_rows (organization_id);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_import      ON public.invoice_ticket_rows (import_id);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_contractor  ON public.invoice_ticket_rows (contractor_name);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_truck       ON public.invoice_ticket_rows (truck_number);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_date        ON public.invoice_ticket_rows (ticket_date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_void        ON public.invoice_ticket_rows (void_status);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_cust_status ON public.invoice_ticket_rows (customer_invoice_status);
CREATE INDEX IF NOT EXISTS idx_inv_ticket_rows_pay_status  ON public.invoice_ticket_rows (payroll_invoice_status);


CREATE TABLE IF NOT EXISTS public.customer_invoices (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number    text,
  customer_name     text,
  job_number        text,
  invoice_date      date,
  invoice_status    text        DEFAULT 'draft',   -- draft | sent | paid | overdue | void
  ar_status         text        DEFAULT 'open',    -- open | partial | paid | written_off
  ticket_count      integer     DEFAULT 0,
  invoice_total     numeric     DEFAULT 0,
  sent_at           timestamptz,
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cust_invoices_org    ON public.customer_invoices (organization_id);
CREATE INDEX IF NOT EXISTS idx_cust_invoices_status ON public.customer_invoices (invoice_status);
CREATE INDEX IF NOT EXISTS idx_cust_invoices_ar     ON public.customer_invoices (ar_status);


CREATE TABLE IF NOT EXISTS public.payroll_invoices (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_invoice_number text,
  contractor_name        text,
  driver_name            text,
  truck_number           text,
  payroll_week_start     date,
  payroll_week_end       date,
  status                 text        DEFAULT 'draft',  -- draft | needs_review | ready_to_pay | payroll_hold | paid | disputed | void
  ticket_total           numeric     DEFAULT 0,
  deduction_total        numeric     DEFAULT 0,
  total_paid             numeric     DEFAULT 0,
  notes                  text,
  created_at             timestamptz DEFAULT now(),
  approved_at            timestamptz,
  paid_at                timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payroll_inv_org         ON public.payroll_invoices (organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_inv_status      ON public.payroll_invoices (status);
CREATE INDEX IF NOT EXISTS idx_payroll_inv_contractor  ON public.payroll_invoices (contractor_name);
CREATE INDEX IF NOT EXISTS idx_payroll_inv_week        ON public.payroll_invoices (payroll_week_start DESC);


CREATE TABLE IF NOT EXISTS public.payroll_invoice_lines (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_invoice_id   uuid        REFERENCES public.payroll_invoices(id) ON DELETE CASCADE,
  ticket_row_id        uuid        REFERENCES public.invoice_ticket_rows(id),

  truck_number         text,
  ticket_date          date,
  ticket_number        text,
  job_description      text,
  qty                  numeric,
  full_rate            numeric,
  ticket_value         numeric,
  lewis_percent        numeric,
  contractor_percent   numeric,
  c_truck_total        numeric,
  payout_rate          numeric,
  payout               numeric,
  line_status          text        DEFAULT 'draft',
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_lines_invoice ON public.payroll_invoice_lines (payroll_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_ticket  ON public.payroll_invoice_lines (ticket_row_id);


CREATE TABLE IF NOT EXISTS public.payroll_invoice_deductions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_invoice_id   uuid        REFERENCES public.payroll_invoices(id) ON DELETE CASCADE,

  contractor_name      text,
  driver_name          text,
  truck_number         text,

  deduction_type       text        NOT NULL,  -- Insurance | Driver Pay | Truck Payment | Advance | Shop | Loan | etc.
  amount               numeric     NOT NULL DEFAULT 0,
  reason               text,
  agreement_required   boolean     DEFAULT false,
  agreement_id         uuid,
  approved_by          uuid,
  status               text        DEFAULT 'needs_review',  -- needs_review | approved | rejected | applied
  payroll_week_start   date,

  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pay_deductions_invoice ON public.payroll_invoice_deductions (payroll_invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_deductions_status  ON public.payroll_invoice_deductions (status);
CREATE INDEX IF NOT EXISTS idx_pay_deductions_type    ON public.payroll_invoice_deductions (deduction_type);


CREATE TABLE IF NOT EXISTS public.invoice_reconciliation_exceptions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,

  ticket_row_id        uuid        REFERENCES public.invoice_ticket_rows(id),
  exception_type       text        NOT NULL,
  severity             text        DEFAULT 'medium',   -- critical | high | medium | low
  issue                text,
  dollar_impact        numeric     DEFAULT 0,
  next_best_action     text,

  contractor_name      text,
  truck_number         text,
  ticket_number        text,

  assigned_role        text,
  assigned_staff_id    uuid,
  status               text        DEFAULT 'open',    -- open | in_progress | resolved | dismissed

  created_at           timestamptz DEFAULT now(),
  resolved_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inv_exceptions_org      ON public.invoice_reconciliation_exceptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_inv_exceptions_status   ON public.invoice_reconciliation_exceptions (status);
CREATE INDEX IF NOT EXISTS idx_inv_exceptions_severity ON public.invoice_reconciliation_exceptions (severity);
CREATE INDEX IF NOT EXISTS idx_inv_exceptions_ticket   ON public.invoice_reconciliation_exceptions (ticket_row_id);

-- RLS on all tables
ALTER TABLE public.invoice_ticket_imports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_ticket_rows               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_invoice_lines             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_invoice_deductions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reconciliation_exceptions ENABLE ROW LEVEL SECURITY;

-- Policies (select + insert for all, update for invoices and exceptions)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'invoice_ticket_imports','invoice_ticket_rows','customer_invoices',
    'payroll_invoices','payroll_invoice_lines','payroll_invoice_deductions',
    'invoice_reconciliation_exceptions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "icc_select" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "icc_insert" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "icc_select" ON public.%I FOR SELECT TO authenticated USING (organization_id = public.current_user_org())', tbl);
    EXECUTE format(
      'CREATE POLICY "icc_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org())', tbl);
  END LOOP;
END $$;

-- Update policies for mutable tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'customer_invoices','payroll_invoices','payroll_invoice_deductions','invoice_reconciliation_exceptions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "icc_update" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "icc_update" ON public.%I FOR UPDATE TO authenticated
       USING (organization_id = public.current_user_org())
       WITH CHECK (organization_id = public.current_user_org())', tbl);
  END LOOP;
END $$;
