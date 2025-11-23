-- 033_ifta_mileage_logs.sql
-- Basic mileage log table to capture driver start/end miles and signature.

CREATE TABLE IF NOT EXISTS ifta_mileage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  log_date date NOT NULL,
  start_miles numeric(12,1) NOT NULL,
  end_miles numeric(12,1) NOT NULL,
  total_miles numeric(12,1) GENERATED ALWAYS AS (end_miles - start_miles) STORED,
  signature_data text NULL, -- data URL (PNG) for quick capture; consider storage in bucket long-term
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(driver_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_ifta_mileage_logs_driver_date ON ifta_mileage_logs(driver_id, log_date);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ifta_mileage_logs_set_updated_at'
  ) THEN
    CREATE TRIGGER ifta_mileage_logs_set_updated_at BEFORE UPDATE ON ifta_mileage_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
