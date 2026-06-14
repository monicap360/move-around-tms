-- Add company assignment and pay basis to driver_profiles
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS pay_basis    text DEFAULT 'hourly'; -- 'hourly' | 'per_load' | 'per_mile'
