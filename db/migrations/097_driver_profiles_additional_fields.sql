-- Migration 097: Add missing fields to driver_profiles so the driver
-- management UI can store and display all required data from one table.

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS driver_type         text    DEFAULT 'W2',
  ADD COLUMN IF NOT EXISTS mvr_expiration      date,
  ADD COLUMN IF NOT EXISTS medical_card_expiration date,
  ADD COLUMN IF NOT EXISTS background_check_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS drug_test_status    text    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rating              numeric(3,2),
  ADD COLUMN IF NOT EXISTS last_ticket_date    date;

-- Storage bucket for driver document files (created here for reference;
-- must also be created in Supabase Dashboard → Storage if it doesn't exist)
-- Bucket name: ronyx-driver-documents   Public: true
