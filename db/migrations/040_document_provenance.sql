-- Digital Provenance & Watermarking System
-- Tracks document integrity, ownership, and metadata

CREATE TABLE IF NOT EXISTS document_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID UNIQUE NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  hash TEXT NOT NULL, -- SHA-256 hash
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  purpose TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_provenance_document_id ON document_provenance(document_id);
CREATE INDEX IF NOT EXISTS idx_document_provenance_organization_id ON document_provenance(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_provenance_user_id ON document_provenance(user_id);
CREATE INDEX IF NOT EXISTS idx_document_provenance_hash ON document_provenance(hash);
CREATE INDEX IF NOT EXISTS idx_document_provenance_timestamp ON document_provenance(timestamp DESC);

-- Document access log for audit trail
CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document_provenance(document_id),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'viewed', 'downloaded', 'verified', 'modified'
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_access_log_document_id ON document_access_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_timestamp ON document_access_log(timestamp DESC);

-- RLS Policies
ALTER TABLE document_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view provenance for their organization
CREATE POLICY "Users can view provenance for their organization"
  ON document_provenance
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create provenance records for their organization
CREATE POLICY "Users can create provenance for their organization"
  ON document_provenance
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can view access logs for their organization's documents
CREATE POLICY "Users can view access logs for their organization"
  ON document_access_log
  FOR SELECT
  USING (
    document_id IN (
      SELECT document_id FROM document_provenance
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: System can insert access logs
CREATE POLICY "System can insert access logs"
  ON document_access_log
  FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_provenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_provenance_updated_at
  BEFORE UPDATE ON document_provenance
  FOR EACH ROW
  EXECUTE FUNCTION update_document_provenance_updated_at();
