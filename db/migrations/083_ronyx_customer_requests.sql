-- Migration: Ronyx customer request intake
CREATE TABLE IF NOT EXISTS public.ronyx_customer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  request_number text,
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  material_type text,
  quantity numeric,
  unit text,
  pickup_location text,
  delivery_location text,
  requested_at timestamptz,
  rate_type text,
  rate_amount numeric,
  status text DEFAULT 'new',
  priority text DEFAULT 'standard',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_customer_requests_status
  ON public.ronyx_customer_requests(status);

CREATE INDEX IF NOT EXISTS idx_ronyx_customer_requests_org
  ON public.ronyx_customer_requests(organization_id);
