-- ============================================================================
-- CALM OPS & INCIDENT RESPONSE SYSTEM
-- Organization-scoped + platform-wide incidents
-- ============================================================================

-- 1. TMS Incidents Table
CREATE TABLE IF NOT EXISTS tms_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = platform-wide
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'stabilizing', 'monitoring', 'resolved')),
  incident_type text, -- 'memory_exhaustion', 'disk_pressure', 'upload_spike', 'bad_deploy', 'dependency_outage', 'network_issue'
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  summary text NOT NULL, -- Short 1-2 line summary
  description text, -- Detailed description
  affected_time_window jsonb, -- { "start": "...", "end": "..." }
  auto_actions_taken jsonb DEFAULT '[]'::jsonb, -- List of auto actions
  current_system_state jsonb DEFAULT '{}'::jsonb, -- Snapshot of system state
  root_cause text, -- Filled after resolution
  prevention_steps text[], -- Array of prevention steps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Incident Events (append-only log)
CREATE TABLE IF NOT EXISTS tms_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES tms_incidents(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL CHECK (source IN ('health_check', 'upload', 'system', 'manual', 'monitor')),
  event_type text NOT NULL, -- 'detection', 'stabilization', 'escalation', 'resolution'
  payload jsonb NOT NULL, -- Event-specific data
  created_at timestamptz DEFAULT now()
);

-- 3. Incident Actions (all actions taken)
CREATE TABLE IF NOT EXISTS tms_incident_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES tms_incidents(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL, -- 'pm2_restart', 'nginx_reload', 'pause_jobs', 'rate_limit', 'clear_temp'
  action_params jsonb DEFAULT '{}'::jsonb,
  result text, -- 'success', 'failed', 'partial'
  result_details jsonb DEFAULT '{}'::jsonb,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. Incident Recommendations (suggested actions)
CREATE TABLE IF NOT EXISTS tms_incident_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES tms_incidents(id) ON DELETE CASCADE NOT NULL,
  recommendation text NOT NULL, -- Clear recommendation text
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  requires_approval boolean DEFAULT true,
  action_type text, -- If recommendation includes an action
  action_params jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. System Health Snapshots (periodic health checks)
CREATE TABLE IF NOT EXISTS tms_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = platform-wide
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('periodic', 'incident', 'manual')),
  metrics jsonb NOT NULL, -- { memory_percent, disk_percent, pm2_status, upload_failure_rate, error_rate }
  incident_id uuid REFERENCES tms_incidents(id) ON DELETE SET NULL, -- If snapshot taken during incident
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON tms_incidents(organization_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_severity_status ON tms_incidents(severity, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_events_incident ON tms_incident_events(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_actions_incident ON tms_incident_actions(incident_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_recommendations_status ON tms_incident_recommendations(incident_id, status);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_org_time ON tms_health_snapshots(organization_id, created_at DESC);

-- Enable RLS
ALTER TABLE tms_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms_incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms_incident_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms_incident_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tms_health_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Incidents: Organization-scoped OR platform-wide (super admin can see all)
CREATE POLICY incidents_org_isolation ON tms_incidents
  FOR SELECT
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR organization_id IS NULL -- Platform-wide incidents visible to super admins
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY incidents_insert ON tms_incidents
  FOR INSERT
  WITH CHECK (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR organization_id IS NULL -- Platform-wide incidents
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY incidents_update ON tms_incidents
  FOR UPDATE
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- Incident Events: Read-only, append-only
CREATE POLICY incident_events_select ON tms_incident_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_events.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

CREATE POLICY incident_events_insert ON tms_incident_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_events.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

-- Incident Actions: Same scoping as incidents
CREATE POLICY incident_actions_select ON tms_incident_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_actions.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

CREATE POLICY incident_actions_insert ON tms_incident_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_actions.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

-- Incident Recommendations: Same scoping
CREATE POLICY incident_recommendations_select ON tms_incident_recommendations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_recommendations.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

CREATE POLICY incident_recommendations_insert ON tms_incident_recommendations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_recommendations.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

CREATE POLICY incident_recommendations_update ON tms_incident_recommendations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tms_incidents
      WHERE tms_incidents.id = tms_incident_recommendations.incident_id
      AND (
        tms_incidents.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR tms_incidents.organization_id IS NULL
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

-- Health Snapshots: Same scoping
CREATE POLICY health_snapshots_select ON tms_health_snapshots
  FOR SELECT
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY health_snapshots_insert ON tms_health_snapshots
  FOR INSERT
  WITH CHECK (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update incident updated_at timestamp
CREATE OR REPLACE FUNCTION update_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incident_timestamp
  BEFORE UPDATE ON tms_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_updated_at();

-- Auto-resolve incidents after 24 hours if no new events
CREATE OR REPLACE FUNCTION auto_resolve_stale_incidents()
RETURNS void AS $$
BEGIN
  UPDATE tms_incidents
  SET 
    status = 'resolved',
    resolved_at = now(),
    summary = summary || ' (Auto-resolved after 24h inactivity)'
  WHERE 
    status IN ('open', 'stabilizing', 'monitoring')
    AND detected_at < now() - interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM tms_incident_events
      WHERE tms_incident_events.incident_id = tms_incidents.id
      AND tms_incident_events.created_at > now() - interval '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tms_incidents IS 'Incidents detected by the TMS. Can be organization-specific or platform-wide.';
COMMENT ON TABLE tms_incident_events IS 'Append-only log of events related to an incident.';
COMMENT ON TABLE tms_incident_actions IS 'All actions taken during an incident. Safe actions can be auto-executed, others require approval.';
COMMENT ON TABLE tms_incident_recommendations IS 'Recommendations generated by the Incident Response Agent. Require approval before execution.';
COMMENT ON TABLE tms_health_snapshots IS 'Periodic health check snapshots for trend analysis and early detection.';

COMMENT ON COLUMN tms_incidents.organization_id IS 'NULL = platform-wide incident, UUID = organization-specific incident';
COMMENT ON COLUMN tms_incidents.auto_actions_taken IS 'List of safe actions automatically taken: ["pm2_restart", "nginx_reload"]';
COMMENT ON COLUMN tms_incidents.current_system_state IS 'Snapshot at incident detection: { memory: 92%, disk: 78%, pm2_restarts: 3 }';
