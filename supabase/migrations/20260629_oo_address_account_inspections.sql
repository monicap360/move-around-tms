-- Driver can move addresses → per-driver address
ALTER TABLE ronyx_oo_drivers ADD COLUMN IF NOT EXISTS address text;

-- In-house account number Ronyx assigns to each owner-operator (internal bookkeeping id)
ALTER TABLE ronyx_owner_operators ADD COLUMN IF NOT EXISTS in_house_account_number text;

-- Truck inspections (annual DOT / periodic) — the new Inspections tab under Trucks
CREATE TABLE IF NOT EXISTS ronyx_oo_truck_inspections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oo_id           uuid NOT NULL,
  truck_id        uuid,
  truck_number    text,
  inspection_type text,                 -- Annual DOT, 90-day, Brake, etc.
  inspection_date date,
  expires_on      date,
  result          text,                 -- Pass / Fail / Conditional
  inspector       text,
  notes           text,
  file_name       text,
  file_url        text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oo_truck_inspections_oo ON ronyx_oo_truck_inspections(oo_id);
