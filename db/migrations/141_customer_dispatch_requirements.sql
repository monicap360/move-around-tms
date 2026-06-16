-- 141_customer_dispatch_requirements.sql
-- Customer-specific dispatch requirement rulebook.
-- Replaces/extends ronyx_customer_compliance_rules with a per-requirement
-- row model so Dispatch Guard can check each rule independently.

-- ── Main rulebook ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_dispatch_requirements (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid,

  customer_name             text        NOT NULL,
  project_name              text,

  applies_to                text        NOT NULL,
  -- 'driver' | 'truck' | 'owner_operator' | 'company' | 'project'

  requirement_key           text        NOT NULL,
  requirement_label         text        NOT NULL,

  requirement_status        text        NOT NULL DEFAULT 'required',
  -- 'required' | 'optional' | 'override_allowed' | 'not_required' | 'project_specific'

  blocks_dispatch           boolean     DEFAULT true,
  requires_expiration_check boolean     DEFAULT true,
  requires_manager_override boolean     DEFAULT false,

  assigned_role             text,
  assigned_staff_id         uuid,
  assigned_staff_name       text,

  is_active                 boolean     DEFAULT true,
  notes                     text,

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

-- Dedup index: one rule per (customer, applies_to, requirement_key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cdr_customer_key_uq
  ON public.customer_dispatch_requirements (customer_name, applies_to, requirement_key)
  WHERE project_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cdr_customer_project_key_uq
  ON public.customer_dispatch_requirements (customer_name, project_name, applies_to, requirement_key)
  WHERE project_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cdr_customer ON public.customer_dispatch_requirements(customer_name);
CREATE INDEX IF NOT EXISTS idx_cdr_key      ON public.customer_dispatch_requirements(requirement_key);

-- ── Check log (audit trail per dispatch attempt) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_requirement_checks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid,

  customer_name       text        NOT NULL,
  project_name        text,

  dispatch_job_id     uuid,
  driver_id           uuid,
  driver_name         text,
  fleet_unit_id       uuid,
  truck_number        text,
  owner_operator_id   uuid,
  company_name        text,

  requirement_id      uuid        REFERENCES public.customer_dispatch_requirements(id) ON DELETE SET NULL,
  requirement_key     text,
  requirement_label   text,

  check_status        text        DEFAULT 'needs_review',
  -- 'passed' | 'failed' | 'warning' | 'overridden' | 'not_required' | 'needs_review'

  block_reason        text,
  override_id         uuid,

  checked_at          timestamptz DEFAULT now(),
  checked_by          uuid,

  next_best_action    text,
  ai_guidance         text,

  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crc_customer ON public.customer_requirement_checks(customer_name);
CREATE INDEX IF NOT EXISTS idx_crc_driver   ON public.customer_requirement_checks(driver_id);
CREATE INDEX IF NOT EXISTS idx_crc_truck    ON public.customer_requirement_checks(truck_number);

-- ── Extend existing overrides table with requirement_key ──────────────────
ALTER TABLE public.ronyx_compliance_overrides
  ADD COLUMN IF NOT EXISTS requirement_key text;

CREATE INDEX IF NOT EXISTS idx_rco_requirement_key
  ON public.ronyx_compliance_overrides(requirement_key);

-- ── Seed Denesse Group default rulebook ───────────────────────────────────
INSERT INTO public.customer_dispatch_requirements (
  customer_name, applies_to, requirement_key, requirement_label,
  requirement_status, blocks_dispatch, requires_expiration_check,
  requires_manager_override, assigned_role, notes
)
SELECT v.*
FROM (VALUES
  ('Denesse Group','driver',         'cdl',                   'CDL / Driver License',              'required',        true,  true,  false,'Compliance Admin','Driver CDL required before dispatch.'),
  ('Denesse Group','driver',         'medical_card',          'Medical Card',                      'required',        true,  true,  false,'Compliance Admin','Medical card required before dispatch.'),
  ('Denesse Group','driver',         'mvr',                   'MVR',                               'required',        true,  true,  false,'Compliance Admin','MVR required before dispatch.'),
  ('Denesse Group','driver',         'drug_test',             'Drug Test',                         'optional',        false, true,  false,'Compliance Admin','Drug test recommended but not required.'),
  ('Denesse Group','driver',         'background_check',      'Background Check',                  'optional',        false, true,  false,'Compliance Admin','Background check optional.'),
  ('Denesse Group','truck',          'truck_insurance',       'Truck Insurance',                   'required',        true,  true,  false,'Fleet Admin',      'Truck insurance required.'),
  ('Denesse Group','truck',          'registration',          'Registration',                      'required',        true,  true,  false,'Fleet Admin',      'Truck registration required.'),
  ('Denesse Group','truck',          'inspection',            'DOT Inspection',                    'required',        true,  true,  false,'Fleet Manager',    'Inspection required.'),
  ('Denesse Group','owner_operator', 'auto_liability_coi',   'Auto Liability COI',                'required',        true,  true,  false,'Compliance Admin','Auto Liability COI required.'),
  ('Denesse Group','owner_operator', 'general_liability_coi','General Liability COI',             'required',        true,  true,  false,'Compliance Admin','General Liability COI required.'),
  ('Denesse Group','owner_operator', 'cargo_coi',            'Cargo COI',                         'override_allowed',true,  true,  true, 'Compliance Admin','Cargo COI required unless manager override.'),
  ('Denesse Group','owner_operator', 'workers_comp',         'Workers Compensation',              'override_allowed',true,  true,  true, 'Compliance Admin','Workers Comp — override allowed by manager.'),
  ('Denesse Group','driver',         'driver_loan_agreement','Driver Loan Agreement (if loan)',    'project_specific',false, false, false,'Payroll Admin',   'Required when driver has active advance/loan.'),
  ('Denesse Group','owner_operator', 'oo_loan_agreement',    'OO Loan Agreement (if loan)',        'project_specific',false, false, false,'Payroll Admin',   'Required when OO has active advance/loan.')
) AS v(customer_name, applies_to, requirement_key, requirement_label, requirement_status,
       blocks_dispatch, requires_expiration_check, requires_manager_override, assigned_role, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.customer_dispatch_requirements c
  WHERE c.customer_name = v.customer_name
    AND c.applies_to    = v.applies_to
    AND c.requirement_key = v.requirement_key
);
