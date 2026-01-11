-- HR Module Database Schema (SQL/Supabase/Access ready)

CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  employee_id TEXT,
  status TEXT,
  hire_date DATE,
  termination_date DATE,
  position TEXT,
  license_number TEXT,
  license_class TEXT,
  license_expiration DATE,
  license_state TEXT,
  endorsements TEXT,
  phone TEXT,
  email TEXT
);

CREATE TABLE compliance (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  cdl_uploaded BOOLEAN,
  medical_certificate_uploaded BOOLEAN,
  drug_alcohol_test_results TEXT,
  safety_training_completed BOOLEAN,
  safety_training_date DATE,
  hos_training_date DATE,
  hazmat_training_date DATE,
  fmcsa_clearinghouse_consent BOOLEAN
);

CREATE TABLE equipment_assignments (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  vehicle_vin TEXT,
  trailer_number TEXT,
  inspection_log_date DATE,
  inspection_result TEXT,
  mileage_report INTEGER,
  accident_report TEXT
);

CREATE TABLE payroll (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  pay_rate TEXT,
  deductions TEXT,
  tax_info TEXT,
  overtime_hours INTEGER,
  benefits TEXT,
  paid_time_off INTEGER
);

CREATE TABLE safety_records (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  accident_details TEXT,
  tickets TEXT,
  meeting_attendance BOOLEAN,
  corrective_actions TEXT
);

CREATE TABLE legal_documents (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  employment_contract_signed BOOLEAN,
  non_compete_signed BOOLEAN,
  background_check_complete BOOLEAN,
  drug_policy_ack BOOLEAN,
  handbook_ack BOOLEAN
);

CREATE TABLE performance_reviews (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  review_date DATE,
  reviewer TEXT,
  scorecard TEXT,
  improvement_plan TEXT,
  disciplinary_actions TEXT
);

CREATE TABLE recruiting (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  application_date DATE,
  referral_source TEXT,
  prehire_checklist_complete BOOLEAN,
  orientation_date DATE,
  trainer_name TEXT,
  road_test_result TEXT,
  road_test_date DATE
);

CREATE TABLE offboarding (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id),
  termination_date DATE,
  termination_reason TEXT,
  equipment_returned BOOLEAN,
  exit_interview_notes TEXT,
  final_paycheck_issued BOOLEAN
);
