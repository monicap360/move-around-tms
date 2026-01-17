-- Migration: Master load schedule for reconciliation (SheetMapper)
CREATE TABLE IF NOT EXISTS public.aggregate_master_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ticket_number text,
  job_name text,
  customer_name text,
  planned_quantity numeric(12,2),
  unit_type text,
  planned_date date,
  truck_identifier text,
  po_number text,
  planned_weight numeric(12,2),
  planned_rate numeric(12,2),
  source_file text,
  raw_row jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_agg_master_loads_org
  ON public.aggregate_master_loads(organization_id);

CREATE INDEX IF NOT EXISTS idx_agg_master_loads_ticket
  ON public.aggregate_master_loads(ticket_number);

CREATE INDEX IF NOT EXISTS idx_agg_master_loads_customer_date
  ON public.aggregate_master_loads(customer_name, planned_date);
