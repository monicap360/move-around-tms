-- Migration 119: Deleted/Archived drivers archive for Manager Alerts
CREATE TABLE IF NOT EXISTS deleted_drivers_archive (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_driver_id      uuid,
  full_name               text NOT NULL,
  phone                   text,
  email                   text,
  driver_type             text,
  prior_status            text,
  license_number          text,
  license_state           text,
  license_expiration_date date,
  medical_card_number     text,
  medical_card_expiration date,
  mvr_expiration          date,
  drug_test_expiration    date,
  background_check_status text,
  assigned_truck_number   text,
  job_assignment          text,
  company_name            text,
  hire_date               date,
  pay_rate                numeric,
  pay_type                text,
  dispatch_eligible       boolean,
  payroll_eligible        boolean,
  compliance_flags        text[],
  notes                   text,
  organization_id         uuid,
  action_type             text NOT NULL DEFAULT 'deleted',  -- 'deleted' | 'archived'
  actioned_at             timestamptz NOT NULL DEFAULT now(),
  actioned_by             text,
  action_reason           text,
  snapshot                jsonb  -- full original row
);

CREATE INDEX IF NOT EXISTS idx_dda_name       ON deleted_drivers_archive(full_name);
CREATE INDEX IF NOT EXISTS idx_dda_actioned   ON deleted_drivers_archive(actioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_dda_action_type ON deleted_drivers_archive(action_type);
