-- Migration: Ronyx payroll rules, deductions, and runs
CREATE TABLE IF NOT EXISTS public.ronyx_payroll_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  driver_id uuid references public.drivers(id) on delete set null,
  pay_type text default 'per_ton',
  pay_rate numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_payroll_rules_driver
  ON public.ronyx_payroll_rules(driver_id);

CREATE TABLE IF NOT EXISTS public.ronyx_driver_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  driver_id uuid references public.drivers(id) on delete set null,
  description text,
  amount numeric(10,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_driver_deductions_driver
  ON public.ronyx_driver_deductions(driver_id);

CREATE TABLE IF NOT EXISTS public.ronyx_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  period_start date not null,
  period_end date not null,
  status text default 'draft',
  created_at timestamptz default now(),
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ronyx_payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid references public.ronyx_payroll_runs(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  driver_name text,
  gross_pay numeric(12,2) default 0,
  deductions numeric(12,2) default 0,
  net_pay numeric(12,2) default 0,
  ticket_ids uuid[] default ARRAY[]::uuid[],
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_payroll_items_run
  ON public.ronyx_payroll_items(run_id);
