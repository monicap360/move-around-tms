-- Geofencing & Geographic Boundary System
-- Tracks geographic boundaries, vehicle entry/exit events, and restrictions

CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('circle', 'polygon', 'rectangle')),
  
  -- Coordinates stored as JSONB for flexibility
  coordinates JSONB NOT NULL,
  -- For circle: { "center": { "lat": 29.7604, "lng": -95.3698 }, "radius": 1000 }
  -- For polygon: { "points": [{ "lat": ..., "lng": ... }, ...] }
  -- For rectangle: { "bounds": { "north": ..., "south": ..., "east": ..., "west": ... } }
  
  radius NUMERIC, -- For circle type (in meters)
  
  -- Rules and restrictions
  rules JSONB DEFAULT '{}',
  -- Example: {
  --   "alertOnEntry": true,
  --   "alertOnExit": true,
  --   "restrictEntry": false,
  --   "restrictExit": false,
  --   "requirePermit": false,
  --   "speedLimit": 55,
  --   "notifyUsers": ["user-id-1", "user-id-2"],
  --   "autoActions": [{"action": "log_event", "params": {}}]
  -- }
  
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_organization_id ON geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(active);
CREATE INDEX IF NOT EXISTS idx_geofences_type ON geofences(type);

-- Geofence events log
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  vehicle_id UUID,
  driver_id UUID,
  truck_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('entry', 'exit', 'inside', 'violation')),
  location JSONB NOT NULL, -- { "lat": 29.7604, "lng": -95.3698 }
  speed NUMERIC,
  heading NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence_id ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_organization_id ON geofence_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_vehicle_id ON geofence_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_driver_id ON geofence_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_event_type ON geofence_events(event_type);
CREATE INDEX IF NOT EXISTS idx_geofence_events_timestamp ON geofence_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_acknowledged ON geofence_events(acknowledged);

-- Geographic restrictions (state/country level)
CREATE TABLE IF NOT EXISTS geographic_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  region_type TEXT NOT NULL CHECK (region_type IN ('state', 'country', 'county', 'city', 'custom')),
  region_code TEXT NOT NULL, -- e.g., 'TX', 'US', 'Harris County'
  region_name TEXT NOT NULL,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('permit_required', 'speed_limit', 'hours_restriction', 'vehicle_type', 'full_restriction')),
  restriction_details JSONB DEFAULT '{}',
  -- Example: {
  --   "permitTypes": ["oversize", "hazmat"],
  --   "speedLimit": 55,
  --   "restrictedHours": {"start": "22:00", "end": "06:00"},
  --   "allowedVehicleTypes": ["flatbed", "van"]
  -- }
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geographic_restrictions_organization_id ON geographic_restrictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_geographic_restrictions_region_code ON geographic_restrictions(region_code);
CREATE INDEX IF NOT EXISTS idx_geographic_restrictions_active ON geographic_restrictions(active);

-- Vehicle geofence status (current state)
CREATE TABLE IF NOT EXISTS vehicle_geofence_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  vehicle_id UUID,
  driver_id UUID,
  truck_id UUID,
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('inside', 'outside', 'entering', 'exiting')),
  entered_at TIMESTAMPTZ,
  last_location JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vehicle_id, geofence_id),
  UNIQUE(driver_id, geofence_id),
  UNIQUE(truck_id, geofence_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_status_vehicle_id ON vehicle_geofence_status(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_status_driver_id ON vehicle_geofence_status(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_status_truck_id ON vehicle_geofence_status(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_geofence_status_geofence_id ON vehicle_geofence_status(geofence_id);

-- RLS Policies
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_geofence_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view geofences for their organization
CREATE POLICY "Users can view geofences for their organization"
  ON geofences
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create geofences for their organization
CREATE POLICY "Users can create geofences for their organization"
  ON geofences
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update geofences for their organization
CREATE POLICY "Users can update geofences for their organization"
  ON geofences
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can view geofence events for their organization
CREATE POLICY "Users can view geofence events for their organization"
  ON geofence_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy: System can insert geofence events
CREATE POLICY "System can insert geofence events"
  ON geofence_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view geographic restrictions
CREATE POLICY "Users can view geographic restrictions"
  ON geographic_restrictions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    ) OR organization_id IS NULL -- Public restrictions
  );

-- Policy: Users can view vehicle geofence status for their organization
CREATE POLICY "Users can view vehicle geofence status for their organization"
  ON vehicle_geofence_status
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION update_geofence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_geofence_updated_at
  BEFORE UPDATE ON geofences
  FOR EACH ROW
  EXECUTE FUNCTION update_geofence_updated_at();

CREATE TRIGGER update_geographic_restriction_updated_at
  BEFORE UPDATE ON geographic_restrictions
  FOR EACH ROW
  EXECUTE FUNCTION update_geofence_updated_at();
