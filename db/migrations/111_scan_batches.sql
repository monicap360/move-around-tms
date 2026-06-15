-- Migration 111: Scan batch tracking for Fast Scan™
-- Supports high-volume batch scanning (Ricoh fi-8170 + ScanSnap)

CREATE TABLE IF NOT EXISTS scan_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name          text,
  scanner_used        text,               -- 'ricoh_fi8170', 'scansnap_ix2500', 'scansnap_ix1600', 'camera', 'other'
  uploaded_by         text,
  org_id              uuid REFERENCES organizations(id) ON DELETE CASCADE,
  status              text DEFAULT 'in_progress',  -- 'in_progress', 'completed', 'paused', 'error'
  started_at          timestamptz DEFAULT now(),
  ended_at            timestamptz,
  page_count          integer DEFAULT 0,
  ticket_count        integer DEFAULT 0,
  ocr_complete_count  integer DEFAULT 0,
  exceptions_count    integer DEFAULT 0,
  duplicate_count     integer DEFAULT 0,
  payroll_holds       integer DEFAULT 0,
  billing_holds       integer DEFAULT 0,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Link tickets to batches
ALTER TABLE aggregate_tickets
  ADD COLUMN IF NOT EXISTS scan_batch_id uuid REFERENCES scan_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scan_quality_flags text[],
  ADD COLUMN IF NOT EXISTS document_category text;  -- 'field_ticket','pit_invoice','driver_document','contract','receipt','other'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_batches_org ON scan_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_scan_batches_status ON scan_batches(status);
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_batch ON aggregate_tickets(scan_batch_id);

-- RLS
ALTER TABLE scan_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_scan_batches" ON scan_batches
  USING (org_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
