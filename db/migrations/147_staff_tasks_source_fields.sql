-- Migration 147: Add source tracking + initials support to ronyx_staff_tasks
--
-- Adds:
--   source_type  — where the task came from (dispatch_import | driver | oo | manual | rmis)
--   source_label — human-readable source description
--   dispatch_import_id — FK to dispatch_imports so tasks link back to a specific import batch
--   driver_profile_id  — FK to driver_profiles for driver-generated tasks
--   initials_required  — flag that staff must enter initials to complete

ALTER TABLE public.ronyx_staff_tasks
  ADD COLUMN IF NOT EXISTS source_type         text,   -- dispatch_import | driver | oo | manual | rmis
  ADD COLUMN IF NOT EXISTS source_label        text,   -- e.g. "Dispatch Import 2026-06-16" or "Driver: John Smith"
  ADD COLUMN IF NOT EXISTS dispatch_import_id  uuid,
  ADD COLUMN IF NOT EXISTS driver_profile_id   uuid,
  ADD COLUMN IF NOT EXISTS initials_required   boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_rst_source_type ON public.ronyx_staff_tasks(source_type) WHERE source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rst_dispatch_import ON public.ronyx_staff_tasks(dispatch_import_id) WHERE dispatch_import_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rst_driver_profile  ON public.ronyx_staff_tasks(driver_profile_id)  WHERE driver_profile_id  IS NOT NULL;
