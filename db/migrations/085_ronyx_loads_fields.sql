-- Migration: Extend Ronyx loads for create/execute/record cycle
ALTER TABLE public.ronyx_loads
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS job_site text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS quantity numeric(12,2),
  ADD COLUMN IF NOT EXISTS unit_type text,
  ADD COLUMN IF NOT EXISTS rate_type text,
  ADD COLUMN IF NOT EXISTS rate_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS pickup_location text,
  ADD COLUMN IF NOT EXISTS delivery_location text,
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS truck_id uuid,
  ADD COLUMN IF NOT EXISTS truck_number text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS ticket_id uuid,
  ADD COLUMN IF NOT EXISTS pod_url text,
  ADD COLUMN IF NOT EXISTS proof_photo_url text,
  ADD COLUMN IF NOT EXISTS status_notes text;

CREATE INDEX IF NOT EXISTS idx_ronyx_loads_driver
  ON public.ronyx_loads(driver_name);

CREATE INDEX IF NOT EXISTS idx_ronyx_loads_truck
  ON public.ronyx_loads(truck_number);
