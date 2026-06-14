-- Migration 102: Add logo_url to ronyx_owner_operators
ALTER TABLE public.ronyx_owner_operators
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Storage bucket for OO logos (run once — safe to re-run)
-- Note: bucket must also be created in Supabase Storage dashboard
-- or via the API route /api/ronyx/owner-operators/setup-storage
