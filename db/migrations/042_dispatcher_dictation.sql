-- Dispatcher Dictation System
-- Speech-to-text for dispatchers - messages delivered as text/system voice
-- IMPORTANT: Drivers receive text/system voice only, NOT live dispatcher voices

-- Dictation sessions (temporary storage for in-progress dictations)
CREATE TABLE IF NOT EXISTS dictation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatcher_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  transcribed_text TEXT,
  reviewed BOOLEAN DEFAULT false,
  edited_text TEXT, -- If dispatcher edited the transcription
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour') -- Cleanup old sessions
);

CREATE INDEX IF NOT EXISTS idx_dictation_sessions_dispatcher ON dictation_sessions(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_dictation_sessions_organization ON dictation_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_dictation_sessions_expires ON dictation_sessions(expires_at);

-- Dictated messages (final messages sent to drivers)
CREATE TABLE IF NOT EXISTS dictated_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dictation_sessions(id) ON DELETE SET NULL,
  dispatcher_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  load_id UUID, -- Associated load (if applicable)
  
  -- Message content
  message_text TEXT NOT NULL,
  original_transcription TEXT, -- Original STT output before edits
  message_length INTEGER NOT NULL, -- Character count
  
  -- Delivery settings
  delivery_method TEXT NOT NULL DEFAULT 'text' CHECK (delivery_method IN ('text', 'system_voice', 'both')),
  system_voice_enabled BOOLEAN DEFAULT false, -- Whether to generate system voice readout
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT max_message_length CHECK (message_length <= 500) -- Safety guardrail
);

CREATE INDEX IF NOT EXISTS idx_dictated_messages_dispatcher ON dictated_messages(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_dictated_messages_driver ON dictated_messages(driver_id);
CREATE INDEX IF NOT EXISTS idx_dictated_messages_organization ON dictated_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_dictated_messages_load ON dictated_messages(load_id);
CREATE INDEX IF NOT EXISTS idx_dictated_messages_status ON dictated_messages(status);
CREATE INDEX IF NOT EXISTS idx_dictated_messages_sent_at ON dictated_messages(sent_at);

-- Message deliveries (tracking delivery to drivers)
CREATE TABLE IF NOT EXISTS message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES dictated_messages(id) ON DELETE CASCADE,
  driver_id TEXT NOT NULL,
  
  -- Delivery method and status
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('text', 'system_voice', 'both')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_deliveries_message ON message_deliveries(message_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_driver ON message_deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_delivered ON message_deliveries(delivered_at);

-- Dictation audit log (full audit trail)
CREATE TABLE IF NOT EXISTS dictation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  dispatcher_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('dictation_started', 'dictation_completed', 'message_reviewed', 'message_sent', 'message_cancelled', 'message_failed')),
  session_id UUID REFERENCES dictation_sessions(id) ON DELETE SET NULL,
  message_id UUID REFERENCES dictated_messages(id) ON DELETE SET NULL,
  driver_id TEXT,
  transcribed_text TEXT,
  metadata JSONB DEFAULT '{}', -- Additional context (confidence, errors, etc.)
  
  -- Index for fast queries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dictation_audit_log_dispatcher ON dictation_audit_log(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_dictation_audit_log_organization ON dictation_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_dictation_audit_log_timestamp ON dictation_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dictation_audit_log_action ON dictation_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_dictation_audit_log_message ON dictation_audit_log(message_id);

-- RLS Policies
ALTER TABLE dictation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictation_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for dictation_sessions
CREATE POLICY "Dispatchers can view their own sessions"
  ON dictation_sessions FOR SELECT
  USING (auth.uid()::text = dispatcher_id OR auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "Dispatchers can create their own sessions"
  ON dictation_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = dispatcher_id);

CREATE POLICY "Dispatchers can update their own sessions"
  ON dictation_sessions FOR UPDATE
  USING (auth.uid()::text = dispatcher_id);

-- Policies for dictated_messages
CREATE POLICY "Dispatchers can view messages they sent"
  ON dictated_messages FOR SELECT
  USING (auth.uid()::text = dispatcher_id OR auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "Dispatchers can send messages"
  ON dictated_messages FOR INSERT
  WITH CHECK (auth.uid()::text = dispatcher_id);

CREATE POLICY "Dispatchers can update their messages (before sending)"
  ON dictated_messages FOR UPDATE
  USING (auth.uid()::text = dispatcher_id AND status = 'pending');

-- Policies for message_deliveries
CREATE POLICY "Drivers can view their deliveries"
  ON message_deliveries FOR SELECT
  USING (auth.uid()::text = driver_id OR auth.jwt() ->> 'role' IN ('admin', 'manager', 'dispatcher'));

CREATE POLICY "System can create deliveries"
  ON message_deliveries FOR INSERT
  WITH CHECK (true); -- Server-side only

CREATE POLICY "Drivers can update their delivery status"
  ON message_deliveries FOR UPDATE
  USING (auth.uid()::text = driver_id);

-- Policies for dictation_audit_log
CREATE POLICY "Admins and managers can view audit logs"
  ON dictation_audit_log FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "System can create audit logs"
  ON dictation_audit_log FOR INSERT
  WITH CHECK (true); -- Server-side only

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_dictation_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM dictation_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create message delivery record
CREATE OR REPLACE FUNCTION create_message_delivery(
  p_message_id UUID,
  p_driver_id TEXT,
  p_delivery_method TEXT
)
RETURNS UUID AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  INSERT INTO message_deliveries (message_id, driver_id, delivery_method, delivered_at)
  VALUES (p_message_id, p_driver_id, p_delivery_method, NOW())
  RETURNING id INTO v_delivery_id;
  
  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql;
