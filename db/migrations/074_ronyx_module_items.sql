-- Migration: Module items for Ronyx section tabs
CREATE TABLE IF NOT EXISTS public.ronyx_module_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  section text NOT NULL,
  title text NOT NULL,
  subtitle text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_module_items_section
  ON public.ronyx_module_items(section);

CREATE INDEX IF NOT EXISTS idx_ronyx_module_items_org
  ON public.ronyx_module_items(organization_id);
