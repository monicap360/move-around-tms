-- Migration: Time Clock System for Driver Profiles
-- Adds time clock functionality with clock in/out and lunch tracking

-- Time clock entries table
CREATE TABLE IF NOT EXISTS public.time_clock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  lunch_start TIMESTAMPTZ,
  lunch_end TIMESTAMPTZ,
  total_hours DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_clock_driver_id ON public.time_clock_entries(driver_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_in ON public.time_clock_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_time_clock_date ON public.time_clock_entries(DATE(clock_in));

-- Add truck information columns to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS truck_type TEXT,
ADD COLUMN IF NOT EXISTS truck_weight TEXT,
ADD COLUMN IF NOT EXISTS truck_year INTEGER,
ADD COLUMN IF NOT EXISTS truck_make TEXT,
ADD COLUMN IF NOT EXISTS truck_model TEXT;

-- Function to calculate total hours worked
CREATE OR REPLACE FUNCTION calculate_time_clock_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    -- Calculate total hours, subtracting lunch time if applicable
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0;
    
    IF NEW.lunch_start IS NOT NULL AND NEW.lunch_end IS NOT NULL THEN
      NEW.total_hours := NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.lunch_end - NEW.lunch_start)) / 3600.0);
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate hours
DROP TRIGGER IF EXISTS time_clock_calculate_hours ON public.time_clock_entries;
CREATE TRIGGER time_clock_calculate_hours
  BEFORE INSERT OR UPDATE ON public.time_clock_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_clock_hours();

-- RLS policies for time clock
ALTER TABLE public.time_clock_entries ENABLE ROW LEVEL SECURITY;

-- Drivers can view and insert their own entries
CREATE POLICY time_clock_driver_select ON public.time_clock_entries
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY time_clock_driver_insert ON public.time_clock_entries
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY time_clock_driver_update ON public.time_clock_entries
  FOR UPDATE
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE email = auth.jwt()->>'email'
    )
  );

-- Managers/HR can view all entries
CREATE POLICY time_clock_manager_all ON public.time_clock_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE email = auth.jwt()->>'email'
      AND (pay_type = 'manager' OR pay_type = 'hr' OR pay_type = 'owner')
    )
  );

-- Comments
COMMENT ON TABLE public.time_clock_entries IS 'Time clock entries for driver attendance and hours tracking';
COMMENT ON COLUMN public.time_clock_entries.clock_in IS 'Time when driver clocked in';
COMMENT ON COLUMN public.time_clock_entries.clock_out IS 'Time when driver clocked out';
COMMENT ON COLUMN public.time_clock_entries.lunch_start IS 'Time when lunch break started';
COMMENT ON COLUMN public.time_clock_entries.lunch_end IS 'Time when lunch break ended';
COMMENT ON COLUMN public.time_clock_entries.total_hours IS 'Total hours worked excluding lunch';

COMMENT ON COLUMN public.drivers.truck_type IS 'Type of truck (e.g., Semi, Box Truck, Flatbed)';
COMMENT ON COLUMN public.drivers.truck_weight IS 'Truck weight classification (e.g., 26000 lbs)';
COMMENT ON COLUMN public.drivers.truck_year IS 'Year of the truck';
COMMENT ON COLUMN public.drivers.truck_make IS 'Make/manufacturer of the truck';
COMMENT ON COLUMN public.drivers.truck_model IS 'Model of the truck';
