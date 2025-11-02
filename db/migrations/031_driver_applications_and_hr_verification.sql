-- Migration: Add HR verification and driver application fields
-- Adds columns to support driver self-service profile completion and HR verification workflow

-- Add new columns to drivers table for profile completion tracking
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS license_state TEXT,
  ADD COLUMN IF NOT EXISTS license_expiration DATE,
  ADD COLUMN IF NOT EXISTS medical_card_expiration DATE,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
  ADD COLUMN IF NOT EXISTS license_document_url TEXT,
  ADD COLUMN IF NOT EXISTS medical_card_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed_by_driver BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hr_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS hr_verified_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hr_notes TEXT,
  ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS license_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS medical_card_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS background_check_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS background_check_date DATE,
  ADD COLUMN IF NOT EXISTS ssn_last_4 TEXT;

-- Create driver_applications table for new driver applications
CREATE TABLE IF NOT EXISTS public.driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  license_number TEXT,
  license_state TEXT,
  license_expiration DATE,
  medical_card_expiration DATE,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  license_document_url TEXT,
  medical_card_url TEXT,
  resume_url TEXT,
  additional_documents_url TEXT[],
  application_status TEXT DEFAULT 'Pending' CHECK (application_status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Withdrawn')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_hr BOOLEAN DEFAULT FALSE,
  reviewed_by_manager BOOLEAN DEFAULT FALSE,
  reviewed_by_owner BOOLEAN DEFAULT FALSE,
  hr_notes TEXT,
  manager_notes TEXT,
  owner_notes TEXT,
  hr_approved BOOLEAN,
  manager_approved BOOLEAN,
  owner_approved BOOLEAN,
  hr_reviewed_at TIMESTAMPTZ,
  manager_reviewed_at TIMESTAMPTZ,
  owner_reviewed_at TIMESTAMPTZ,
  final_decision TEXT CHECK (final_decision IN ('Approved', 'Rejected', NULL)),
  final_decision_date TIMESTAMPTZ,
  final_decision_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_applications_email ON public.driver_applications(email);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON public.driver_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_drivers_hr_verified ON public.drivers(hr_verified);
CREATE INDEX IF NOT EXISTS idx_drivers_profile_completed ON public.drivers(profile_completed_by_driver);

-- Add comments
COMMENT ON COLUMN public.drivers.profile_completed_by_driver IS 'Indicates if driver completed their own profile';
COMMENT ON COLUMN public.drivers.hr_verified IS 'Indicates if HR has verified and approved the driver profile';
COMMENT ON COLUMN public.drivers.documents_verified IS 'Indicates if all driver documents have been verified';
COMMENT ON TABLE public.driver_applications IS 'Stores new driver applications for review by HR, Manager, and Owner';

-- Enable RLS on driver_applications
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can insert their own applications
CREATE POLICY driver_applications_insert_own ON public.driver_applications
  FOR INSERT
  WITH CHECK (
    auth.jwt()->>'email' = email
  );

-- Policy: Drivers can view their own applications
CREATE POLICY driver_applications_select_own ON public.driver_applications
  FOR SELECT
  USING (
    auth.jwt()->>'email' = email
  );

-- Policy: HR, Manager, Owner can view all applications
CREATE POLICY driver_applications_select_staff ON public.driver_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.email = auth.jwt()->>'email'
      AND users.role IN ('admin', 'manager', 'hr', 'owner')
    )
  );

-- Policy: HR, Manager, Owner can update applications
CREATE POLICY driver_applications_update_staff ON public.driver_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.email = auth.jwt()->>'email'
      AND users.role IN ('admin', 'manager', 'hr', 'owner')
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS driver_applications_updated_at_trigger ON public.driver_applications;
CREATE TRIGGER driver_applications_updated_at_trigger
  BEFORE UPDATE ON public.driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_applications_updated_at();
