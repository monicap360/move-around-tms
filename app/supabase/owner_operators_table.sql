-- Create owner_operators table for Veronica's RonYX Fleet Management
-- This table will store owner-operator data for the RonYX partner portal

CREATE TABLE IF NOT EXISTS owner_operators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Company Information
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  
  -- Business Details
  monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  payment_status VARCHAR(50) DEFAULT 'Active' CHECK (payment_status IN ('Active', 'Pending', 'Overdue')),
  
  -- Fleet Information
  truck_count INTEGER DEFAULT 1,
  trailer_count INTEGER DEFAULT 0,
  
  -- Performance Metrics
  monthly_revenue DECIMAL(12,2) DEFAULT 0.00,
  rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0.0 AND rating <= 5.0),
  
  -- Partner Association
  partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_owner_operators_updated_at 
    BEFORE UPDATE ON owner_operators 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE owner_operators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owner_operators table
-- Super admins can access all records
CREATE POLICY "Super admins can view all owner operators" ON owner_operators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
        OR is_super_admin()
    );

CREATE POLICY "Super admins can insert owner operators" ON owner_operators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
        OR is_super_admin()
    );

CREATE POLICY "Super admins can update owner operators" ON owner_operators
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
        OR is_super_admin()
    );

CREATE POLICY "Super admins can delete owner operators" ON owner_operators
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'super_admin'
        )
        OR is_super_admin()
    );

-- Partners can only see their own owner operators
CREATE POLICY "Partners can view their own owner operators" ON owner_operators
    FOR SELECT USING (
        partner_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'partner' 
            AND profiles.id = owner_operators.partner_id
        )
    );

CREATE POLICY "Partners can insert their own owner operators" ON owner_operators
    FOR INSERT WITH CHECK (
        partner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'partner'
        )
    );

CREATE POLICY "Partners can update their own owner operators" ON owner_operators
    FOR UPDATE USING (
        partner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'partner' 
            AND profiles.id = owner_operators.partner_id
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_owner_operators_partner_id ON owner_operators(partner_id);
CREATE INDEX IF NOT EXISTS idx_owner_operators_status ON owner_operators(status);
CREATE INDEX IF NOT EXISTS idx_owner_operators_payment_status ON owner_operators(payment_status);

-- Insert sample data for Veronica's RonYX Fleet Management
-- This will be populated after we identify Veronica's profile ID
INSERT INTO owner_operators (
    company_name, contact_name, contact_email, contact_phone, 
    monthly_fee, payment_status, truck_count, trailer_count, 
    monthly_revenue, rating, status
) VALUES 
    ('Elite Trucking LLC', 'Carlos Rodriguez', 'carlos@elitetrucking.com', '(555) 123-4567', 1200.00, 'Active', 3, 2, 15500.00, 4.8, 'active'),
    ('Highway Heroes', 'Maria Santos', 'maria@highwayheroes.com', '(555) 234-5678', 950.00, 'Active', 2, 1, 12300.00, 4.9, 'active'),
    ('Lone Star Transport', 'Jake Wilson', 'jake@lonestar.com', '(555) 345-6789', 1100.00, 'Pending', 2, 3, 14200.00, 4.7, 'active'),
    ('Desert Express', 'Ahmed Hassan', 'ahmed@desertexpress.com', '(555) 456-7890', 850.00, 'Active', 1, 1, 9800.00, 4.6, 'active'),
    ('Mountain Movers', 'Lisa Chen', 'lisa@mountainmovers.com', '(555) 567-8901', 1350.00, 'Overdue', 4, 2, 18900.00, 4.5, 'active'),
    ('Coastal Cargo', 'Robert Brown', 'robert@coastalcargo.com', '(555) 678-9012', 975.00, 'Active', 2, 1, 11700.00, 4.8, 'active'),
    ('Thunder Road', 'Diana Martinez', 'diana@thunderroad.com', '(555) 789-0123', 1075.00, 'Active', 2, 2, 13400.00, 4.9, 'active'),
    ('Phoenix Freight', 'Michael Johnson', 'michael@phoenixfreight.com', '(555) 890-1234', 1250.00, 'Pending', 3, 1, 16800.00, 4.7, 'active');

-- Comment: To link these records to Veronica's partner profile:
-- UPDATE owner_operators SET partner_id = 'VERONICA_PROFILE_UUID' WHERE partner_id IS NULL;
-- Replace 'VERONICA_PROFILE_UUID' with Veronica's actual profile ID from the profiles table