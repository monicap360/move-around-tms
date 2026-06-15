-- Migration 112: Driver Import Center
-- Tracks driver roster imports from Excel/CSV/PDF

CREATE TABLE IF NOT EXISTS driver_import_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by         uuid,
  file_name           text,
  upload_type         text,   -- 'excel', 'csv', 'pdf'
  total_rows          integer DEFAULT 0,
  imported_count      integer DEFAULT 0,
  updated_count       integer DEFAULT 0,
  duplicate_count     integer DEFAULT 0,
  failed_count        integer DEFAULT 0,
  needs_review_count  integer DEFAULT 0,
  status              text DEFAULT 'processing',  -- 'processing', 'completed', 'failed'
  created_at          timestamptz DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_driver_import_batches_org ON driver_import_batches(organization_id);

-- Add import tracking + compliance columns to drivers if missing
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS import_batch_id      uuid REFERENCES driver_import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compliance_flags     text[],
  ADD COLUMN IF NOT EXISTS dispatch_eligible    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_eligible     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS drug_test_expiration date,
  ADD COLUMN IF NOT EXISTS background_check_status text,
  ADD COLUMN IF NOT EXISTS hire_date            date,
  ADD COLUMN IF NOT EXISTS pay_rate             numeric(10,2),
  ADD COLUMN IF NOT EXISTS pay_type             text,
  ADD COLUMN IF NOT EXISTS owner_operator_company text;

-- RLS
ALTER TABLE driver_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_driver_import_batches" ON driver_import_batches
  USING (organization_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));
