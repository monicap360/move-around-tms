-- 032_scheduling.sql
-- Scheduling and availability schema: trucks, shifts, driver_availability, shift_swap_requests

-- Trucks catalog (optional; if you already have a trucks table, adjust accordingly)
CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text,
  weight text,
  year integer,
  make text,
  model text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shifts are created per truck and can be open or assigned
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending_approval','approved','denied')),
  requested_driver_id uuid NULL,
  assigned_driver_id uuid NULL,
  created_by uuid NULL,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_truck ON shifts(truck_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

-- Driver availability for specific dates, with optional window and standby
CREATE TABLE IF NOT EXISTS driver_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  date date NOT NULL,
  available boolean NOT NULL DEFAULT true,
  start_time time NULL,
  end_time time NULL,
  standby boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(driver_id, date)
);

CREATE INDEX IF NOT EXISTS idx_driver_availability_driver_date ON driver_availability(driver_id, date);

-- Shift swap/pickup requests (manager approval required)
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  from_driver_id uuid NOT NULL,
  to_driver_id uuid NULL, -- if specified to a particular person; null means open to eligible
  type text NOT NULL CHECK (type IN ('swap','pickup')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  message text NULL,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swap_requests_shift ON shift_swap_requests(shift_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON shift_swap_requests(status);

-- Simple updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trucks_set_updated_at'
  ) THEN
    CREATE TRIGGER trucks_set_updated_at BEFORE UPDATE ON trucks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'shifts_set_updated_at'
  ) THEN
    CREATE TRIGGER shifts_set_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'driver_availability_set_updated_at'
  ) THEN
    CREATE TRIGGER driver_availability_set_updated_at BEFORE UPDATE ON driver_availability
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'shift_swap_requests_set_updated_at'
  ) THEN
    CREATE TRIGGER shift_swap_requests_set_updated_at BEFORE UPDATE ON shift_swap_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Note: Configure RLS according to your auth model. For now, RLS is not enabled on new tables.
-- Recommended follow-up: enable RLS and add policies for drivers to upsert their own availability
-- and request pickup/swap; managers approve.
