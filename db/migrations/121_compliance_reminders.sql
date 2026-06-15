-- Migration 121: Compliance Reminders — log every reminder sent to driver/OO

CREATE TABLE IF NOT EXISTS compliance_reminders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid,
  work_item_id      uuid REFERENCES compliance_work_items(id) ON DELETE SET NULL,
  entity_type       text,
  entity_id         uuid,
  recipient_name    text,
  recipient_contact text,
  message           text,
  reminder_type     text DEFAULT 'manual',   -- 'manual' | 'auto' | 'sms' | 'email'
  status            text DEFAULT 'logged',   -- 'logged' | 'sent' | 'failed'
  sent_by           uuid,
  sent_by_name      text,
  sent_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_work_item ON compliance_reminders(work_item_id);
CREATE INDEX IF NOT EXISTS idx_cr_entity    ON compliance_reminders(entity_id);
CREATE INDEX IF NOT EXISTS idx_cr_sent_at   ON compliance_reminders(sent_at DESC);

ALTER TABLE compliance_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON compliance_reminders
  FOR ALL USING (current_setting('role', true) = 'service_role');
