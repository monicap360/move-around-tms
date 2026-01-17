-- Migration: Ronyx loads for Loads module
CREATE TABLE IF NOT EXISTS public.ronyx_loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  load_number text,
  route text,
  status text,
  driver_name text,
  customer_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_loads_status
  ON public.ronyx_loads(status);

CREATE INDEX IF NOT EXISTS idx_ronyx_loads_org
  ON public.ronyx_loads(organization_id);
