-- Migration 146: CDL class + front/back uploads + OO date of hire
--
-- driver_profiles:
--   - hire_date already exists (UI calls it "hire_date")
--   - license_class already exists (CDL class A/B/C)
--   - CDL front/back handled as document types "CDL Front" and "CDL Back"
--     in the existing driver documents system — no new columns needed.
--
-- ronyx_oo_drivers (OO sub-driver records):
--   + cdl_class      (A, B, C)
--   + cdl_front_url  (storage path for front of CDL)
--   + cdl_back_url   (storage path for back of CDL)
--
-- ronyx_owner_operators (OO company):
--   + date_of_hire   (primary operator hire / onboard date)
--   + cdl_class      (primary operator CDL class)
--   + cdl_front_url  (primary operator CDL front)
--   + cdl_back_url   (primary operator CDL back)
--
-- COI management already uses ronyx_oo_coi_documents — no scalar columns needed.

ALTER TABLE public.ronyx_oo_drivers
  ADD COLUMN IF NOT EXISTS cdl_class     text CHECK (cdl_class IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS cdl_front_url text,
  ADD COLUMN IF NOT EXISTS cdl_back_url  text;

ALTER TABLE public.ronyx_owner_operators
  ADD COLUMN IF NOT EXISTS date_of_hire  date,
  ADD COLUMN IF NOT EXISTS cdl_class     text CHECK (cdl_class IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS cdl_front_url text,
  ADD COLUMN IF NOT EXISTS cdl_back_url  text;
