-- Ronyx Supabase schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

CREATE SCHEMA IF NOT EXISTS ronyx;
SET search_path TO ronyx, public;

CREATE TABLE ronyx.drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT DEFAULT 'ronyx' NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_state TEXT,
    license_expiry DATE,
    medical_expiry DATE,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    pay_type TEXT DEFAULT 'per_ton' CHECK (pay_type IN ('per_ton', 'per_yard', 'per_load', 'hourly', 'salary')),
    pay_rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ronyx.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT DEFAULT 'ronyx' NOT NULL,
    material_code TEXT UNIQUE NOT NULL,
    material_type TEXT NOT NULL,
    description TEXT,
    supplier TEXT,
    stockpile_location TEXT,
    current_inventory DECIMAL(10,2),
    unit TEXT DEFAULT 'ton',
    base_rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ronyx.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT DEFAULT 'ronyx' NOT NULL,
    ticket_number TEXT UNIQUE NOT NULL,
    driver_id UUID REFERENCES ronyx.drivers(id) ON DELETE SET NULL,
    material_id UUID REFERENCES ronyx.materials(id) ON DELETE SET NULL,
    gross_weight DECIMAL(10,2),
    tare_weight DECIMAL(10,2),
    net_weight DECIMAL(10,2) GENERATED ALWAYS AS (gross_weight - tare_weight) STORED,
    rate_type TEXT DEFAULT 'per_ton',
    rate_amount DECIMAL(10,2),
    fuel_surcharge DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    pickup_location TEXT,
    delivery_location TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    ticket_image_path TEXT,
    pod_image_path TEXT,
    ticket_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ronyx.compliance_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT DEFAULT 'ronyx' NOT NULL,
    driver_id UUID REFERENCES ronyx.drivers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    expiry_date DATE,
    status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expiring', 'expired')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ronyx.payroll_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT DEFAULT 'ronyx' NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'completed', 'paid')),
    total_amount DECIMAL(12,2) DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ronyx.driver_settlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT DEFAULT 'ronyx' NOT NULL,
    driver_id UUID REFERENCES ronyx.drivers(id) ON DELETE CASCADE,
    payroll_period_id UUID REFERENCES ronyx.payroll_periods(id) ON DELETE CASCADE,
    total_tickets INTEGER DEFAULT 0,
    total_tons DECIMAL(10,2) DEFAULT 0,
    total_yards DECIMAL(10,2) DEFAULT 0,
    gross_pay DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ronyx_drivers_tenant ON ronyx.drivers(tenant_id);
CREATE INDEX idx_ronyx_tickets_tenant_date ON ronyx.tickets(tenant_id, ticket_date);
CREATE INDEX idx_ronyx_tickets_driver ON ronyx.tickets(driver_id);
CREATE INDEX idx_ronyx_tickets_status ON ronyx.tickets(status);
CREATE INDEX idx_ronyx_compliance_driver ON ronyx.compliance_documents(driver_id, expiry_date);
CREATE INDEX idx_ronyx_settlements_period ON ronyx.driver_settlements(payroll_period_id);

ALTER TABLE ronyx.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ronyx.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ronyx.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ronyx.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ronyx.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ronyx.driver_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ronyx_tenant_access ON ronyx.drivers
    FOR ALL USING (tenant_id = 'ronyx');

CREATE POLICY ronyx_tenant_access ON ronyx.materials
    FOR ALL USING (tenant_id = 'ronyx');

CREATE POLICY ronyx_tenant_access ON ronyx.tickets
    FOR ALL USING (tenant_id = 'ronyx');

CREATE POLICY ronyx_tenant_access ON ronyx.compliance_documents
    FOR ALL USING (tenant_id = 'ronyx');

CREATE POLICY ronyx_tenant_access ON ronyx.payroll_periods
    FOR ALL USING (tenant_id = 'ronyx');

CREATE POLICY ronyx_tenant_access ON ronyx.driver_settlements
    FOR ALL USING (tenant_id = 'ronyx');

ALTER PUBLICATION supabase_realtime ADD TABLE ronyx.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ronyx.drivers;

CREATE OR REPLACE FUNCTION ronyx.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON ronyx.drivers
    FOR EACH ROW EXECUTE FUNCTION ronyx.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON ronyx.materials
    FOR EACH ROW EXECUTE FUNCTION ronyx.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON ronyx.tickets
    FOR EACH ROW EXECUTE FUNCTION ronyx.update_updated_at_column();

CREATE OR REPLACE FUNCTION ronyx.calculate_ticket_total(
    p_net_weight DECIMAL,
    p_rate_amount DECIMAL,
    p_fuel_surcharge DECIMAL DEFAULT 0
) RETURNS DECIMAL AS $$
BEGIN
    RETURN (p_net_weight * p_rate_amount) + p_fuel_surcharge;
END;
$$ LANGUAGE plpgsql;

CREATE VIEW ronyx.driver_earnings AS
SELECT 
    d.id as driver_id,
    d.first_name || ' ' || d.last_name as driver_name,
    COUNT(t.id) as total_tickets,
    SUM(t.net_weight) as total_tons,
    SUM(t.total_amount) as total_earnings,
    EXTRACT(MON FROM t.ticket_date) as month,
    EXTRACT(YEAR FROM t.ticket_date) as year
FROM ronyx.drivers d
LEFT JOIN ronyx.tickets t ON d.id = t.driver_id
WHERE t.status = 'approved'
GROUP BY d.id, d.first_name, d.last_name, month, year;

SELECT 'Ronyx schema created successfully.' as message;
