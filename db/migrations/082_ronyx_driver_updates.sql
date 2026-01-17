-- Migration: Driver app updates (status + notes)
CREATE TABLE IF NOT EXISTS public.ronyx_driver_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name text,
  status text,
  notes text,
  ticket_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_driver_updates_status
  ON public.ronyx_driver_updates(status);
