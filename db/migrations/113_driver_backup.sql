-- Migration 113: Driver Backup Data + Import Sync
-- Adds Ronyx CDL/Medical Card spreadsheet columns, enhances import tracking, creates backup view

-- Add Ronyx-specific columns to drivers
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS medical_card_number text,
  ADD COLUMN IF NOT EXISTS job_assignment       text,
  ADD COLUMN IF NOT EXISTS company_name         text,
  ADD COLUMN IF NOT EXISTS updated_by           text;

-- Enhance driver_import_batches with compliance counts
ALTER TABLE driver_import_batches
  ADD COLUMN IF NOT EXISTS missing_cdl_count     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missing_medical_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expired_cdl_count     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expired_medical_count integer DEFAULT 0;

-- Backup data view (matches Ronyx CDL/Medical Card spreadsheet format)
CREATE OR REPLACE VIEW driver_backup_data_view AS
SELECT
  d.id,
  d.full_name               AS driver_name,
  d.license_number          AS cdl_number,
  d.license_expiration_date AS cdl_expiration,
  d.assigned_truck_number   AS truck_number,
  d.medical_card_number,
  d.medical_card_expiration,
  d.job_assignment,
  d.company_name,
  d.status                  AS driver_status,
  d.dispatch_eligible,
  d.payroll_eligible,
  d.compliance_flags,
  d.updated_at              AS last_updated,
  d.updated_by,
  d.notes,
  d.organization_id
FROM drivers d;
