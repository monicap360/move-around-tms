-- Enhanced Driver Profile Schema for TMS HR System
-- This script creates the comprehensive driver profile table and supporting views
-- Compatible with Supabase/PostgreSQL

-- Create the enhanced drivers table
CREATE TABLE IF NOT EXISTS drivers_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal Information
    name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    date_of_birth DATE,
    
    -- Employment Information
    hire_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave', 'Terminated')),
    position VARCHAR(100),
    department VARCHAR(100),
    supervisor VARCHAR(255),
    years_experience INTEGER,
    pay_rate DECIMAL(10,2),
    pay_type VARCHAR(20) CHECK (pay_type IN ('hourly', 'mileage', 'salary')),
    
    -- CDL Information
    cdl_number VARCHAR(50) NOT NULL,
    cdl_class VARCHAR(1) NOT NULL CHECK (cdl_class IN ('A', 'B', 'C')),
    cdl_expiration DATE NOT NULL,
    driver_license_state VARCHAR(2),
    endorsements JSONB DEFAULT '[]'::jsonb, -- Array of endorsement strings
    restrictions TEXT,
    
    -- Medical Information
    medical_cert_expiration DATE,
    medical_examiner VARCHAR(255),
    medical_restrictions TEXT,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Performance Metrics
    safety_score INTEGER DEFAULT 100 CHECK (safety_score >= 0 AND safety_score <= 100),
    total_miles BIGINT DEFAULT 0,
    accident_count INTEGER DEFAULT 0,
    violation_count INTEGER DEFAULT 0,
    last_violation_date DATE,
    on_time_percentage INTEGER DEFAULT 100 CHECK (on_time_percentage >= 0 AND on_time_percentage <= 100),
    fuel_efficiency DECIMAL(5,2),
    
    -- Training & Certifications
    hazmat_cert BOOLEAN DEFAULT FALSE,
    hazmat_expiration DATE,
    defensive_driving_cert BOOLEAN DEFAULT FALSE,
    defensive_driving_expiration DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drivers_enhanced_employee_id ON drivers_enhanced(employee_id);
CREATE INDEX IF NOT EXISTS idx_drivers_enhanced_email ON drivers_enhanced(email);
CREATE INDEX IF NOT EXISTS idx_drivers_enhanced_status ON drivers_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_drivers_enhanced_cdl_expiration ON drivers_enhanced(cdl_expiration);
CREATE INDEX IF NOT EXISTS idx_drivers_enhanced_medical_expiration ON drivers_enhanced(medical_cert_expiration);

-- Create a view for expiring documents/certifications
CREATE OR REPLACE VIEW driver_certifications_expiring AS
SELECT 
    id,
    name,
    employee_id,
    'CDL License' as cert_type,
    cdl_expiration as expiration_date,
    EXTRACT(DAYS FROM (cdl_expiration - CURRENT_DATE)) as days_until_expiration
FROM drivers_enhanced 
WHERE cdl_expiration <= CURRENT_DATE + INTERVAL '60 days'
  AND status = 'Active'

UNION ALL

SELECT 
    id,
    name,
    employee_id,
    'DOT Medical Certificate' as cert_type,
    medical_cert_expiration as expiration_date,
    EXTRACT(DAYS FROM (medical_cert_expiration - CURRENT_DATE)) as days_until_expiration
FROM drivers_enhanced 
WHERE medical_cert_expiration IS NOT NULL 
  AND medical_cert_expiration <= CURRENT_DATE + INTERVAL '60 days'
  AND status = 'Active'

UNION ALL

SELECT 
    id,
    name,
    employee_id,
    'HAZMAT Certificate' as cert_type,
    hazmat_expiration as expiration_date,
    EXTRACT(DAYS FROM (hazmat_expiration - CURRENT_DATE)) as days_until_expiration
FROM drivers_enhanced 
WHERE hazmat_cert = TRUE 
  AND hazmat_expiration IS NOT NULL 
  AND hazmat_expiration <= CURRENT_DATE + INTERVAL '60 days'
  AND status = 'Active'

UNION ALL

SELECT 
    id,
    name,
    employee_id,
    'Defensive Driving Certificate' as cert_type,
    defensive_driving_expiration as expiration_date,
    EXTRACT(DAYS FROM (defensive_driving_expiration - CURRENT_DATE)) as days_until_expiration
FROM drivers_enhanced 
WHERE defensive_driving_cert = TRUE 
  AND defensive_driving_expiration IS NOT NULL 
  AND defensive_driving_expiration <= CURRENT_DATE + INTERVAL '60 days'
  AND status = 'Active';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_drivers_enhanced_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_drivers_enhanced_updated_at ON drivers_enhanced;
CREATE TRIGGER trigger_drivers_enhanced_updated_at
    BEFORE UPDATE ON drivers_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_drivers_enhanced_updated_at();

-- Update existing driver_documents table to reference enhanced drivers
-- (Assuming you already have a driver_documents table)
-- ALTER TABLE driver_documents ADD COLUMN IF NOT EXISTS driver_enhanced_id UUID REFERENCES drivers_enhanced(id);

-- Create a view that combines driver info with document counts for the directory
CREATE OR REPLACE VIEW drivers_directory AS
SELECT 
    de.*,
    COALESCE(doc_counts.total_documents, 0) as document_count,
    COALESCE(exp_counts.expiring_documents, 0) as expiring_docs
FROM drivers_enhanced de
LEFT JOIN (
    SELECT 
        driver_id,
        COUNT(*) as total_documents
    FROM driver_documents 
    GROUP BY driver_id
) doc_counts ON de.id::text = doc_counts.driver_id
LEFT JOIN (
    SELECT 
        driver_id,
        COUNT(*) as expiring_documents
    FROM driver_documents 
    WHERE expiration_date <= CURRENT_DATE + INTERVAL '60 days'
      AND expiration_date IS NOT NULL
    GROUP BY driver_id
) exp_counts ON de.id::text = exp_counts.driver_id;

-- Insert sample data (optional, for testing)
INSERT INTO drivers_enhanced (
    name, employee_id, phone, email, hire_date, 
    cdl_number, cdl_class, cdl_expiration, 
    position, status, safety_score
) VALUES 
(
    'John Smith', 'DR001', '(555) 123-4567', 'john.smith@ronyxlogistics.com', '2023-01-15',
    'CDL123456789', 'A', '2026-06-30',
    'Lead Driver', 'Active', 95
),
(
    'Sarah Johnson', 'DR002', '(555) 234-5678', 'sarah.johnson@ronyxlogistics.com', '2023-03-20',
    'CDL987654321', 'A', '2025-12-15',
    'Driver', 'Active', 88
),
(
    'Mike Rodriguez', 'DR003', '(555) 345-6789', 'mike.rodriguez@ronyxlogistics.com', '2022-08-10',
    'CDL456789123', 'B', '2025-11-30',
    'Local Driver', 'Active', 92
)
ON CONFLICT (employee_id) DO NOTHING;

-- Set up Row Level Security (RLS) policies if needed
-- ALTER TABLE drivers_enhanced ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
-- CREATE POLICY "Enable read access for authenticated users" ON drivers_enhanced
--     FOR SELECT USING (auth.role() = 'authenticated');

-- CREATE POLICY "Enable insert access for authenticated users" ON drivers_enhanced
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Enable update access for authenticated users" ON drivers_enhanced
--     FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions (adjust based on your authentication setup)
-- GRANT SELECT, INSERT, UPDATE ON drivers_enhanced TO authenticated;
-- GRANT SELECT ON drivers_directory TO authenticated;
-- GRANT SELECT ON driver_certifications_expiring TO authenticated;