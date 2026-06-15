-- Migration 120: Compliance Work Items — staff work queue for HR/DOT compliance

CREATE TABLE IF NOT EXISTS compliance_work_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid,
  entity_type          text,           -- 'driver' | 'vehicle' | 'owner_operator' | 'company'
  entity_id            uuid,
  entity_name          text,
  issue_type           text NOT NULL,  -- 'CDL_EXPIRED' | 'MEDICAL_CARD_MISSING' | etc.
  priority             text NOT NULL DEFAULT 'upcoming',  -- 'stop_now' | 'fix_today' | 'this_week' | 'upcoming' | 'waiting' | 'complete'
  status               text NOT NULL DEFAULT 'open',     -- 'open' | 'assigned' | 'waiting_on_driver' | 'waiting_on_owner' | 'document_uploaded' | 'ready_to_review' | 'resolved' | 'snoozed'
  assigned_to          uuid,
  assigned_to_name     text,
  assigned_at          timestamptz,
  due_date             date,
  days_remaining       integer,
  days_overdue         integer,
  dispatch_blocked     boolean DEFAULT false,
  payroll_blocked      boolean DEFAULT false,
  required_action      text,
  last_reminder_at     timestamptz,
  snoozed_until        date,
  owner_review_required boolean DEFAULT false,
  resolved_at          timestamptz,
  resolved_by          uuid,
  resolved_by_name     text,
  notes                text,
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cwi_org       ON compliance_work_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_cwi_entity    ON compliance_work_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_cwi_priority  ON compliance_work_items(priority);
CREATE INDEX IF NOT EXISTS idx_cwi_status    ON compliance_work_items(status);
CREATE INDEX IF NOT EXISTS idx_cwi_assigned  ON compliance_work_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cwi_due       ON compliance_work_items(due_date);

ALTER TABLE compliance_work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON compliance_work_items
  FOR ALL USING (current_setting('role', true) = 'service_role');
