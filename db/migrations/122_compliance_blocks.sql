-- Migration 122: Compliance Blocks — dispatch/payroll block records with audit trail

CREATE TABLE IF NOT EXISTS compliance_blocks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  entity_type      text NOT NULL,  -- 'driver' | 'vehicle' | 'owner_operator'
  entity_id        uuid NOT NULL,
  entity_name      text,
  block_type       text NOT NULL,  -- 'dispatch' | 'payroll' | 'vehicle'
  reason           text NOT NULL,
  issue_type       text,           -- the compliance issue causing the block
  status           text NOT NULL DEFAULT 'active',  -- 'active' | 'cleared' | 'overridden'
  blocked_by       uuid,
  blocked_by_name  text,
  blocked_at       timestamptz NOT NULL DEFAULT now(),
  cleared_by       uuid,
  cleared_by_name  text,
  cleared_at       timestamptz,
  override_used    boolean DEFAULT false,
  override_reason  text,
  notes            text
);

CREATE INDEX IF NOT EXISTS idx_cb_entity      ON compliance_blocks(entity_id);
CREATE INDEX IF NOT EXISTS idx_cb_status      ON compliance_blocks(status);
CREATE INDEX IF NOT EXISTS idx_cb_block_type  ON compliance_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_cb_org         ON compliance_blocks(organization_id);

ALTER TABLE compliance_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON compliance_blocks
  FOR ALL USING (current_setting('role', true) = 'service_role');
