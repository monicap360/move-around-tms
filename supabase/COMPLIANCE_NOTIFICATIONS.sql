-- Table: compliance_notifications
CREATE TABLE IF NOT EXISTS compliance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- 'overdue', 'repeat_defect', 'at_risk', etc.
  truck_number text,
  dvir_id bigint,
  message text NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  recipient_email text
);

CREATE INDEX IF NOT EXISTS idx_compliance_notifications_sent ON compliance_notifications(sent);
CREATE INDEX IF NOT EXISTS idx_compliance_notifications_truck ON compliance_notifications(truck_number);
