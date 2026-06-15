-- Migration 114: Truck specs — plate details, axle config, weight ratings, size class, capacity
-- ronyx_trucks already has: truck_number, vin, make, model, year, status, notes, truck_type, plate, odometer

ALTER TABLE public.ronyx_trucks
  -- Plate details (plate column exists; adding state + expiration)
  ADD COLUMN IF NOT EXISTS plate_state           text,
  ADD COLUMN IF NOT EXISTS plate_expiration       date,

  -- Axle configuration
  ADD COLUMN IF NOT EXISTS axle_config            text,        -- single, tandem, tri-axle, quad-axle, quint-axle
  ADD COLUMN IF NOT EXISTS axle_count             integer,     -- number of axles (2, 3, 4, 5...)

  -- Weight ratings (lbs)
  ADD COLUMN IF NOT EXISTS gvwr                   integer,     -- Gross Vehicle Weight Rating
  ADD COLUMN IF NOT EXISTS tare_weight            integer,     -- empty/curb weight
  ADD COLUMN IF NOT EXISTS max_payload_lbs        integer,     -- max legal payload in lbs
  ADD COLUMN IF NOT EXISTS max_payload_tons       numeric(8,2),-- max legal payload in tons

  -- Size / class
  ADD COLUMN IF NOT EXISTS dot_class              text,        -- Class 6, Class 7, Class 8
  ADD COLUMN IF NOT EXISTS truck_size             text,        -- Medium, Heavy, Super Heavy

  -- Body / dump bed
  ADD COLUMN IF NOT EXISTS body_type              text,        -- dump, flatbed, tanker, end-dump, side-dump, belly-dump, live-bottom
  ADD COLUMN IF NOT EXISTS bed_capacity_yards     numeric(6,2),-- cubic yards (dump trucks)
  ADD COLUMN IF NOT EXISTS bed_capacity_tons      numeric(6,2),-- tons per load

  -- Registration
  ADD COLUMN IF NOT EXISTS registration_state     text,
  ADD COLUMN IF NOT EXISTS registration_expiration date,
  ADD COLUMN IF NOT EXISTS dot_number             text,
  ADD COLUMN IF NOT EXISTS mc_number              text,

  -- Fuel
  ADD COLUMN IF NOT EXISTS fuel_type              text DEFAULT 'diesel', -- diesel, gasoline, CNG, electric

  -- Insurance
  ADD COLUMN IF NOT EXISTS insurance_policy       text,
  ADD COLUMN IF NOT EXISTS insurance_expiration   date,

  -- Tracking
  ADD COLUMN IF NOT EXISTS assigned_driver_id     uuid,
  ADD COLUMN IF NOT EXISTS owner_operator_id      uuid;

-- Useful index for axle config lookups
CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_axle_config
  ON public.ronyx_trucks(axle_config);

CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_status
  ON public.ronyx_trucks(status);
