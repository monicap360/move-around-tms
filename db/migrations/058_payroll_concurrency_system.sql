-- ============================================================================
-- PAYROLL CONCURRENCY, THROTTLING & BACKUP PLAN
-- Prevents simultaneous payroll execution from crashing the system
-- ============================================================================

-- 1. Payroll Jobs Table
CREATE TABLE IF NOT EXISTS payroll_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'paused')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  requested_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 2,
  progress_percent integer DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  metadata jsonb DEFAULT '{}'::jsonb,
  checkpoint_data jsonb DEFAULT '{}'::jsonb, -- For recovery from interruption
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_jobs_status ON payroll_jobs(status, requested_at ASC);
CREATE INDEX IF NOT EXISTS idx_payroll_jobs_org_status ON payroll_jobs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_jobs_running ON payroll_jobs(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_payroll_jobs_queued ON payroll_jobs(status, priority DESC, requested_at ASC) WHERE status IN ('queued', 'paused');

-- 2. Payroll Job Events (audit trail)
CREATE TABLE IF NOT EXISTS payroll_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES payroll_jobs(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('queued', 'started', 'progress', 'checkpoint', 'paused', 'resumed', 'completed', 'failed', 'cancelled')),
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_job_events_job ON payroll_job_events(job_id, created_at DESC);

-- 3. Global Payroll Lock (for concurrency control)
CREATE TABLE IF NOT EXISTS payroll_global_lock (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton row
  current_running_count integer DEFAULT 0 CHECK (current_running_count >= 0),
  max_concurrent_jobs integer DEFAULT 2 CHECK (max_concurrent_jobs > 0),
  paused boolean DEFAULT false,
  paused_reason text,
  last_updated timestamptz DEFAULT now()
);

-- Initialize global lock row
INSERT INTO payroll_global_lock (id, current_running_count, max_concurrent_jobs, paused)
VALUES (1, 0, 2, false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE payroll_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_global_lock ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Payroll Jobs: Organization-scoped
CREATE POLICY payroll_jobs_org_isolation ON payroll_jobs
  FOR SELECT
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY payroll_jobs_insert ON payroll_jobs
  FOR INSERT
  WITH CHECK (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY payroll_jobs_update ON payroll_jobs
  FOR UPDATE
  USING (
    organization_id = auth.jwt() ->> 'organization_id'::text::uuid
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- Payroll Job Events: Same scoping as jobs
CREATE POLICY payroll_job_events_select ON payroll_job_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payroll_jobs
      WHERE payroll_jobs.id = payroll_job_events.job_id
      AND (
        payroll_jobs.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

CREATE POLICY payroll_job_events_insert ON payroll_job_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payroll_jobs
      WHERE payroll_jobs.id = payroll_job_events.job_id
      AND (
        payroll_jobs.organization_id = auth.jwt() ->> 'organization_id'::text::uuid
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
        )
      )
    )
  );

-- Global Lock: Super admin only
CREATE POLICY payroll_global_lock_select ON payroll_global_lock
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

CREATE POLICY payroll_global_lock_update ON payroll_global_lock
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_super_admin')::boolean = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Update job updated_at timestamp
CREATE OR REPLACE FUNCTION update_payroll_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_job_timestamp
  BEFORE UPDATE ON payroll_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_job_updated_at();

-- Acquire payroll slot (atomic operation)
CREATE OR REPLACE FUNCTION acquire_payroll_slot()
RETURNS boolean AS $$
DECLARE
  current_count integer;
  max_jobs integer;
  is_paused boolean;
BEGIN
  -- Get current state
  SELECT current_running_count, max_concurrent_jobs, paused
  INTO current_count, max_jobs, is_paused
  FROM payroll_global_lock
  WHERE id = 1
  FOR UPDATE; -- Row-level lock

  -- Check if paused
  IF is_paused THEN
    RETURN false;
  END IF;

  -- Check if slot available
  IF current_count >= max_jobs THEN
    RETURN false;
  END IF;

  -- Acquire slot
  UPDATE payroll_global_lock
  SET 
    current_running_count = current_running_count + 1,
    last_updated = now()
  WHERE id = 1;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Release payroll slot
CREATE OR REPLACE FUNCTION release_payroll_slot()
RETURNS void AS $$
BEGIN
  UPDATE payroll_global_lock
  SET 
    current_running_count = GREATEST(0, current_running_count - 1),
    last_updated = now()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- Check if organization has active payroll job
CREATE OR REPLACE FUNCTION has_active_payroll_job(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payroll_jobs
    WHERE organization_id = org_id
    AND status IN ('queued', 'running', 'paused')
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payroll_jobs IS 'Payroll execution jobs. Enforced concurrency limits prevent system overload.';
COMMENT ON TABLE payroll_job_events IS 'Audit trail for payroll job lifecycle events.';
COMMENT ON TABLE payroll_global_lock IS 'Singleton table for global payroll concurrency control. Max 2 concurrent jobs by default.';

COMMENT ON COLUMN payroll_jobs.status IS 'Job status: queued (waiting), running (executing), completed (success), failed (error), paused (system stress)';
COMMENT ON COLUMN payroll_jobs.checkpoint_data IS 'State saved for recovery if job is interrupted. Includes last processed ticket ID, calculations, etc.';
COMMENT ON COLUMN payroll_jobs.metadata IS 'Job-specific data: pay period, ticket IDs, calculation parameters, etc.';

COMMENT ON COLUMN payroll_global_lock.max_concurrent_jobs IS 'Maximum number of payroll jobs that can run simultaneously. Default: 2.';
COMMENT ON COLUMN payroll_global_lock.paused IS 'If true, no new payroll jobs will start. Existing jobs continue.';
COMMENT ON COLUMN payroll_global_lock.paused_reason IS 'Reason for pausing: system stress, incident, manual pause, etc.';
