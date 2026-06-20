-- 195_custom_field_values_on_entities.sql
-- Add custom_fields jsonb storage column to the core entity tables that
-- organization_custom_fields (migration 192) defines metadata for.
-- Values are stored as {field_key: value} per organization convention.
-- Table names verified against existing migrations before this file was written.

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ronyx_trucks
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ronyx_projects
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.invoice_ticket_rows
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ronyx_customers
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.payroll_invoices
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.maintenance_work_orders
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ronyx_owner_operators
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- GIN indexes for efficient jsonb field queries
CREATE INDEX IF NOT EXISTS idx_driver_profiles_custom_fields
  ON public.driver_profiles USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_custom_fields
  ON public.ronyx_trucks USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_ronyx_projects_custom_fields
  ON public.ronyx_projects USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_ronyx_customers_custom_fields
  ON public.ronyx_customers USING GIN (custom_fields);
