-- Add notes column to ronyx_oo_jobs if not present
ALTER TABLE public.ronyx_oo_jobs ADD COLUMN IF NOT EXISTS notes text;
