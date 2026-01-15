-- ELD device status (last known location)

CREATE TABLE IF NOT EXISTS eld_device_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  device_id TEXT NOT NULL,
  driver_id UUID,
  truck_id UUID,
  last_lat NUMERIC(10,6),
  last_lng NUMERIC(10,6),
  last_status TEXT,
  last_timestamp TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider, device_id)
);

CREATE INDEX IF NOT EXISTS idx_eld_device_status_org
  ON eld_device_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_eld_device_status_provider
  ON eld_device_status(provider);
CREATE INDEX IF NOT EXISTS idx_eld_device_status_device
  ON eld_device_status(device_id);

ALTER TABLE eld_device_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ELD device status for their organization"
  ON eld_device_status
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage ELD device status"
  ON eld_device_status
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_eld_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eld_device_status_updated_at
  BEFORE UPDATE ON eld_device_status
  FOR EACH ROW
  EXECUTE FUNCTION update_eld_status_updated_at();
