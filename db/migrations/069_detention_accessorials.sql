-- Detention & Accessorials Tracking
-- Automated detention events and claims

CREATE TABLE IF NOT EXISTS detention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL UNIQUE,
  free_minutes INTEGER NOT NULL DEFAULT 60,
  rate_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 75,
  auto_approve_threshold NUMERIC(10, 2) NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detention_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  load_reference TEXT,
  ticket_id UUID,
  carrier_id UUID,
  driver_id UUID,
  truck_id UUID,
  geofence_id UUID REFERENCES geofences(id) ON DELETE SET NULL,
  facility_name TEXT NOT NULL,
  arrived_at TIMESTAMPTZ NOT NULL,
  departed_at TIMESTAMPTZ,
  total_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('geofence', 'manual', 'ocr')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detention_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  detention_event_id UUID REFERENCES detention_events(id) ON DELETE SET NULL,
  carrier_id UUID,
  load_reference TEXT,
  ticket_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',
    'approved',
    'paid',
    'disputed',
    'rejected'
  )),
  claimed_minutes INTEGER NOT NULL,
  free_minutes INTEGER NOT NULL DEFAULT 0,
  rate_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 75,
  claim_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  evidence JSONB DEFAULT '{}'::jsonb,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detention_events_org ON detention_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_detention_events_status ON detention_events(status);
CREATE INDEX IF NOT EXISTS idx_detention_events_arrived_at ON detention_events(arrived_at DESC);

CREATE INDEX IF NOT EXISTS idx_detention_claims_org ON detention_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_detention_claims_status ON detention_claims(status);
CREATE INDEX IF NOT EXISTS idx_detention_claims_created ON detention_claims(created_at DESC);

ALTER TABLE detention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE detention_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE detention_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view detention policies for their organization"
  ON detention_policies
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage detention policies for their organization"
  ON detention_policies
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view detention events for their organization"
  ON detention_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage detention events for their organization"
  ON detention_events
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view detention claims for their organization"
  ON detention_claims
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage detention claims for their organization"
  ON detention_claims
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION update_detention_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detention_policies_updated_at
  BEFORE UPDATE ON detention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_detention_updated_at();

CREATE TRIGGER update_detention_events_updated_at
  BEFORE UPDATE ON detention_events
  FOR EACH ROW
  EXECUTE FUNCTION update_detention_updated_at();

CREATE TRIGGER update_detention_claims_updated_at
  BEFORE UPDATE ON detention_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_detention_updated_at();
