-- Attach trigger to tickets table
DROP TRIGGER IF EXISTS trg_prevent_ticket_update_if_payroll_locked ON public.tickets;
CREATE TRIGGER trg_prevent_ticket_update_if_payroll_locked
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION prevent_ticket_update_if_payroll_locked();
-- Prevent ticket updates if payroll period is locked
CREATE OR REPLACE FUNCTION prevent_ticket_update_if_payroll_locked()
RETURNS trigger AS $$
DECLARE
  payroll_status TEXT;
BEGIN
  IF NEW.payroll_period_id IS NOT NULL THEN
    SELECT status
    INTO payroll_status
    FROM payroll_periods
    WHERE id = NEW.payroll_period_id;

    IF payroll_status = 'locked' THEN
      RAISE EXCEPTION 'Payroll period is locked. Ticket updates are not allowed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ===========================================
-- MOVEAROUND TMS
-- HR + PAYROLL + TAX MANAGEMENT SCHEMA
-- ===========================================

-- NOTE: This migration introduces standalone HR/Payroll tables while preserving
-- the existing drivers- and ticket-based payroll. We keep drivers as the
-- source of truth for operations; employees can be used for broader HR needs.

-- 1) PEOPLE (Employees). Separate from drivers to avoid breaking existing code.
CREATE TABLE IF NOT EXISTS public.employees (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         text NOT NULL,
    role_type         text CHECK (role_type IN ('DRIVER','OWNER_OPERATOR','OFFICE_STAFF')) NOT NULL,
    worker_type       text CHECK (worker_type IN ('W2','1099')) NOT NULL,
    pay_type          text CHECK (pay_type IN ('hourly','percentage','fixed','per_yard','per_ton','per_load')) NOT NULL,
    hourly_rate       numeric(10,2),
    percentage_rate   numeric(5,2),
    salary_amount     numeric(12,2),
    tax_id            text,
    phone             text,
    email             text,
    address           text,
    truck_id          uuid,
    contract_url      text,
    active            boolean DEFAULT true,
    created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role_type);
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(active);

-- Optional uniqueness when available
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_employees_email'
  ) THEN
    CREATE UNIQUE INDEX ux_employees_email ON public.employees((lower(email))) WHERE email IS NOT NULL;
  END IF;
END $$;

-- Seed employees from existing drivers (best-effort; id remains independent)
-- Map drivers.employment_type -> worker_type; drivers.pay_type -> basic pay_type guess.
INSERT INTO public.employees (
  full_name, role_type, worker_type, pay_type, phone, email, active
)
SELECT
  d.name AS full_name,
  'DRIVER' AS role_type,
  CASE WHEN lower(COALESCE(d.employment_type,'1099')) = 'w2' THEN 'W2' ELSE '1099' END AS worker_type,
  CASE WHEN d.pay_type = 'Hour' THEN 'hourly' ELSE 'percentage' END AS pay_type,
  d.phone,
  d.email,
  true
FROM public.drivers d
LEFT JOIN public.employees e ON e.email IS NOT NULL AND lower(e.email) = lower(d.email)
WHERE e.id IS NULL;

-- 2) PAYROLL ENTRIES
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id        uuid REFERENCES public.employees(id) ON DELETE CASCADE,
    pay_period_start   date NOT NULL,
    pay_period_end     date NOT NULL,
    total_hours        numeric(10,2) DEFAULT 0,
    hourly_rate        numeric(10,2),
    percentage_rate    numeric(5,2),
    load_revenue       numeric(12,2) DEFAULT 0,
    deductions         numeric(12,2) DEFAULT 0,
    gross_pay          numeric(12,2) DEFAULT 0,
    net_pay            numeric(12,2) DEFAULT 0,
    pay_type           text CHECK (pay_type IN ('hourly','percentage','fixed','per_yard','per_ton','per_load')),
    filed_941          boolean DEFAULT false,
    filed_1099         boolean DEFAULT false,
    created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON public.payroll_entries(pay_period_start, pay_period_end);

-- 3) CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     uuid REFERENCES public.employees(id) ON DELETE CASCADE,
    contract_type   text CHECK (contract_type IN ('W2','1099','LEASE')),
    contract_terms  text,
    contract_url    text,
    start_date      date,
    end_date        date,
    renewal         boolean DEFAULT false,
    signed_by       text,
    created_at      timestamptz DEFAULT now()
);

-- 4) TAX FILINGS (940 / 941 / W-2 / 1099)
CREATE TABLE IF NOT EXISTS public.payroll_tax_filings (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_type      text CHECK (form_type IN ('940','941','W2','1099')) NOT NULL,
    period_start   date,
    period_end     date,
    filing_date    date,
    status         text CHECK (status IN ('filed','pending','overdue')) DEFAULT 'pending',
    uploaded_pdf   text,
    submitted_by   uuid REFERENCES public.employees(id),
    created_at     timestamptz DEFAULT now()
);

-- 5) AUTO CALCULATION FUNCTION
CREATE OR REPLACE FUNCTION public.calc_net_pay()
RETURNS trigger AS $$
BEGIN
  IF NEW.pay_type = 'hourly' THEN
    NEW.gross_pay := COALESCE(NEW.total_hours,0) * COALESCE(NEW.hourly_rate,0);
    NEW.net_pay   := NEW.gross_pay - COALESCE(NEW.deductions,0);

  ELSIF NEW.pay_type = 'percentage' THEN
    NEW.gross_pay := COALESCE(NEW.load_revenue,0) * (COALESCE(NEW.percentage_rate,0) / 100);
    NEW.net_pay   := NEW.gross_pay - COALESCE(NEW.deductions,0);

  ELSIF NEW.pay_type = 'fixed' THEN
    NEW.gross_pay := COALESCE((SELECT salary_amount FROM public.employees WHERE id = NEW.employee_id),0);
    NEW.net_pay   := NEW.gross_pay - COALESCE(NEW.deductions,0);

  ELSIF NEW.pay_type = 'per_yard' THEN
    NEW.gross_pay := COALESCE(NEW.yards,0) * COALESCE((SELECT yard_rate FROM public.drivers WHERE id = NEW.employee_id),0);
    NEW.net_pay   := NEW.gross_pay - COALESCE(NEW.deductions,0);

  ELSIF NEW.pay_type = 'per_ton' THEN
    NEW.gross_pay := COALESCE(NEW.net_tons,0) * COALESCE((SELECT ton_rate FROM public.drivers WHERE id = NEW.employee_id),0);
    NEW.net_pay   := NEW.gross_pay - COALESCE(NEW.deductions,0);

  ELSIF NEW.pay_type = 'per_load' THEN
    NEW.gross_pay := COALESCE((SELECT load_rate FROM public.drivers WHERE id = NEW.employee_id),0);
    NEW.net_pay   := NEW.gross_pay - COALESCE(NEW.deductions,0);
  END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) TRIGGER TO AUTO-CALCULATE NET PAY
DROP TRIGGER IF EXISTS trg_calc_net_pay ON public.payroll_entries;
CREATE TRIGGER trg_calc_net_pay
BEFORE INSERT OR UPDATE ON public.payroll_entries
FOR EACH ROW EXECUTE FUNCTION public.calc_net_pay();

-- 7) VIEWS FOR REPORTS
CREATE OR REPLACE VIEW public.v_quarterly_941 AS
SELECT
    date_trunc('quarter', pay_period_end) AS quarter,
    SUM(gross_pay) AS total_wages,
    SUM(net_pay)   AS total_net,
    COUNT(DISTINCT employee_id) AS employee_count
FROM public.payroll_entries
WHERE pay_type='hourly'
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.v_1099_summary AS
SELECT
    e.full_name,
    e.role_type,
    SUM(pe.net_pay) AS total_paid
FROM public.employees e
JOIN public.payroll_entries pe ON pe.employee_id = e.id
WHERE e.worker_type = '1099'
GROUP BY e.full_name, e.role_type
ORDER BY total_paid DESC;

COMMENT ON VIEW public.v_quarterly_941 IS 'Quarterly summary for 941 calculations based on hourly payroll entries.';
COMMENT ON VIEW public.v_1099_summary IS 'Annual summary of 1099 payments by employee.';
