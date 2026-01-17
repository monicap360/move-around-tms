-- Migration: Ronyx integrations catalog
CREATE TABLE IF NOT EXISTS public.ronyx_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  status text DEFAULT 'disconnected',
  enabled boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_integrations_category
  ON public.ronyx_integrations(category);
