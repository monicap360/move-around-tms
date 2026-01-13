-- Data Confidence & Anomaly Detection System
-- Phase 1: Confidence scoring and anomaly detection for tickets, loads, and documents
-- Tracks data reliability and identifies deviations from historical patterns

-- Data Confidence Events
-- Tracks confidence scores for fields in tickets, loads, and documents
CREATE TABLE IF NOT EXISTS data_confidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ticket', 'load', 'document')),
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  confidence_score NUMERIC(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reason TEXT,
  baseline_type TEXT, -- 'driver_historical', 'site_historical', 'global'
  baseline_value NUMERIC,
  actual_value NUMERIC,
  deviation_percentage NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for fast lookups
  CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_data_confidence_events_entity ON data_confidence_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_data_confidence_events_created_at ON data_confidence_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_confidence_events_confidence_score ON data_confidence_events(confidence_score);
CREATE INDEX IF NOT EXISTS idx_data_confidence_events_field ON data_confidence_events(field_name);

-- Anomaly Events
-- Tracks anomalies detected in tickets, loads, and documents
CREATE TABLE IF NOT EXISTS anomaly_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('ticket', 'load', 'document')),
  entity_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL, -- 'deviation', 'outlier', 'pattern_break', 'missing_data'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  baseline_reference TEXT, -- JSON or text describing the baseline used
  explanation TEXT NOT NULL,
  field_name TEXT,
  baseline_value NUMERIC,
  actual_value NUMERIC,
  deviation_percentage NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  detected_by TEXT DEFAULT 'system', -- 'system', 'user', 'rule'
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_anomaly_events_entity ON anomaly_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_severity ON anomaly_events(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_created_at ON anomaly_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_resolved ON anomaly_events(resolved);
CREATE INDEX IF NOT EXISTS idx_anomaly_events_anomaly_type ON anomaly_events(anomaly_type);

-- RLS Policies
ALTER TABLE data_confidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_events ENABLE ROW LEVEL SECURITY;

-- Policies for data_confidence_events
CREATE POLICY "Users can view confidence events for their organization"
  ON data_confidence_events FOR SELECT
  USING (true); -- Adjust based on your organization structure

CREATE POLICY "System can insert confidence events"
  ON data_confidence_events FOR INSERT
  WITH CHECK (true); -- Server-side only

-- Policies for anomaly_events
CREATE POLICY "Users can view anomaly events for their organization"
  ON anomaly_events FOR SELECT
  USING (true); -- Adjust based on your organization structure

CREATE POLICY "Users can update anomaly events (resolve)"
  ON anomaly_events FOR UPDATE
  USING (true); -- Adjust based on permissions

CREATE POLICY "System can insert anomaly events"
  ON anomaly_events FOR INSERT
  WITH CHECK (true); -- Server-side only

-- Helper function: Calculate confidence score based on deviation
CREATE OR REPLACE FUNCTION calculate_confidence_score(
  actual_value NUMERIC,
  baseline_value NUMERIC,
  max_deviation_percentage NUMERIC DEFAULT 50
)
RETURNS NUMERIC AS $$
DECLARE
  deviation_pct NUMERIC;
  confidence NUMERIC;
BEGIN
  IF baseline_value IS NULL OR baseline_value = 0 THEN
    RETURN 0.5; -- Unknown baseline = medium confidence
  END IF;
  
  -- Calculate percentage deviation
  deviation_pct = ABS((actual_value - baseline_value) / baseline_value) * 100;
  
  -- Convert deviation to confidence (0-1 scale)
  -- Small deviations = high confidence, large deviations = low confidence
  IF deviation_pct <= 5 THEN
    confidence := 0.95; -- Very small deviation
  ELSIF deviation_pct <= 10 THEN
    confidence := 0.85;
  ELSIF deviation_pct <= 20 THEN
    confidence := 0.70;
  ELSIF deviation_pct <= 30 THEN
    confidence := 0.55;
  ELSIF deviation_pct <= 50 THEN
    confidence := 0.40;
  ELSE
    confidence := 0.25; -- Very large deviation
  END IF;
  
  RETURN GREATEST(0.0, LEAST(1.0, confidence));
END;
$$ LANGUAGE plpgsql;

-- Helper function: Record confidence event
CREATE OR REPLACE FUNCTION record_confidence_event(
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_field_name TEXT,
  p_confidence_score NUMERIC,
  p_reason TEXT DEFAULT NULL,
  p_baseline_type TEXT DEFAULT NULL,
  p_baseline_value NUMERIC DEFAULT NULL,
  p_actual_value NUMERIC DEFAULT NULL,
  p_deviation_percentage NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO data_confidence_events (
    entity_type,
    entity_id,
    field_name,
    confidence_score,
    reason,
    baseline_type,
    baseline_value,
    actual_value,
    deviation_percentage
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_field_name,
    p_confidence_score,
    p_reason,
    p_baseline_type,
    p_baseline_value,
    p_actual_value,
    p_deviation_percentage
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Record anomaly event
CREATE OR REPLACE FUNCTION record_anomaly_event(
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_anomaly_type TEXT,
  p_severity TEXT,
  p_explanation TEXT,
  p_baseline_reference TEXT DEFAULT NULL,
  p_field_name TEXT DEFAULT NULL,
  p_baseline_value NUMERIC DEFAULT NULL,
  p_actual_value NUMERIC DEFAULT NULL,
  p_deviation_percentage NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO anomaly_events (
    entity_type,
    entity_id,
    anomaly_type,
    severity,
    explanation,
    baseline_reference,
    field_name,
    baseline_value,
    actual_value,
    deviation_percentage
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_anomaly_type,
    p_severity,
    p_explanation,
    p_baseline_reference,
    p_field_name,
    p_baseline_value,
    p_actual_value,
    p_deviation_percentage
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;
