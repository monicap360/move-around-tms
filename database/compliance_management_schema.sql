-- Advanced Compliance Management Schema
-- Comprehensive DOT and regulatory compliance tracking system

-- DOT Compliance Requirements Table
CREATE TABLE dot_compliance_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requirement_type VARCHAR(100) NOT NULL, -- 'medical_certificate', 'drug_test', 'background_check', etc.
    requirement_name VARCHAR(200) NOT NULL,
    description TEXT,
    frequency_days INTEGER, -- How often it needs to be renewed (365 for annual, etc.)
    mandatory BOOLEAN DEFAULT true,
    regulation_reference VARCHAR(100), -- DOT regulation reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Driver Compliance Status Table
CREATE TABLE driver_compliance_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES dot_compliance_requirements(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'compliant', 'pending', 'overdue', 'non_compliant'
    last_completion_date DATE,
    expiration_date DATE,
    next_due_date DATE,
    document_id UUID, -- Reference to uploaded document
    notes TEXT,
    verified_by VARCHAR(100),
    verified_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(driver_id, requirement_id)
);

-- Compliance Violations Table
CREATE TABLE compliance_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    violation_type VARCHAR(100) NOT NULL, -- 'dot', 'fmcsa', 'state', 'company_policy'
    violation_code VARCHAR(50),
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'minor', -- 'minor', 'major', 'serious', 'critical'
    violation_date DATE NOT NULL,
    location VARCHAR(200),
    fine_amount DECIMAL(10,2),
    court_date DATE,
    resolution_status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved', 'dismissed', 'pending_court'
    resolution_date DATE,
    resolution_notes TEXT,
    impact_on_csa BOOLEAN DEFAULT false,
    csa_category VARCHAR(50), -- 'unsafe_driving', 'crash_indicator', 'hos_compliance', etc.
    reported_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit Trail Table
CREATE TABLE compliance_audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL, -- 'dot_inspection', 'internal_audit', 'compliance_check'
    audit_date DATE NOT NULL,
    auditor_name VARCHAR(100),
    auditor_organization VARCHAR(100),
    scope TEXT, -- What was audited
    findings TEXT,
    recommendations TEXT,
    compliance_score DECIMAL(5,2), -- Overall compliance percentage
    critical_issues INTEGER DEFAULT 0,
    major_issues INTEGER DEFAULT 0,
    minor_issues INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'corrective_actions_pending', 'closed'
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance Alerts Table
CREATE TABLE compliance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'expiration_warning', 'overdue', 'violation', 'audit_due'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    driver_id UUID REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES dot_compliance_requirements(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    due_date DATE,
    alert_date DATE DEFAULT CURRENT_DATE,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_date TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    resolved_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fleet Compliance Metrics Table
CREATE TABLE fleet_compliance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE DEFAULT CURRENT_DATE,
    total_drivers INTEGER NOT NULL,
    compliant_drivers INTEGER DEFAULT 0,
    drivers_with_violations INTEGER DEFAULT 0,
    pending_requirements INTEGER DEFAULT 0,
    overdue_requirements INTEGER DEFAULT 0,
    overall_compliance_rate DECIMAL(5,2), -- Percentage
    dot_compliance_rate DECIMAL(5,2),
    medical_compliance_rate DECIMAL(5,2),
    license_compliance_rate DECIMAL(5,2),
    training_compliance_rate DECIMAL(5,2),
    csa_score DECIMAL(8,4), -- Carrier Safety Assessment score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert Standard DOT Compliance Requirements
INSERT INTO dot_compliance_requirements (requirement_type, requirement_name, description, frequency_days, regulation_reference) VALUES
('medical_certificate', 'DOT Medical Certificate', 'Valid DOT medical examiner certificate', 730, '49 CFR 391.43'),
('cdl_license', 'Commercial Driver License', 'Valid CDL appropriate for vehicle class', 1460, '49 CFR 383'),
('drug_test', 'Pre-Employment Drug Test', 'DOT required pre-employment drug screening', NULL, '49 CFR 382.301'),
('alcohol_test', 'Random Alcohol Testing', 'DOT mandated random alcohol testing', 365, '49 CFR 382.305'),
('background_check', 'Employment Background Check', 'Background verification and employment history', NULL, '49 CFR 391.23'),
('driving_record', 'Motor Vehicle Record Check', 'Annual driving record verification', 365, '49 CFR 391.25'),
('road_test', 'Road Skills Test', 'Practical driving skills evaluation', NULL, '49 CFR 391.31'),
('safety_training', 'Entry Level Driver Training', 'ELDT certification for new CDL drivers', NULL, '49 CFR 380'),
('hazmat_endorsement', 'HazMat Endorsement', 'Hazardous materials endorsement (if required)', 1825, '49 CFR 383.141'),
('passenger_endorsement', 'Passenger Endorsement', 'Passenger vehicle endorsement (if required)', 1460, '49 CFR 383.117'),
('school_bus_endorsement', 'School Bus Endorsement', 'School bus endorsement (if required)', 1460, '49 CFR 383.119');

-- Create indexes for performance
CREATE INDEX idx_driver_compliance_status_driver_id ON driver_compliance_status(driver_id);
CREATE INDEX idx_driver_compliance_status_expiration ON driver_compliance_status(expiration_date);
CREATE INDEX idx_driver_compliance_status_status ON driver_compliance_status(status);
CREATE INDEX idx_compliance_violations_driver_id ON compliance_violations(driver_id);
CREATE INDEX idx_compliance_violations_date ON compliance_violations(violation_date);
CREATE INDEX idx_compliance_violations_severity ON compliance_violations(severity);
CREATE INDEX idx_compliance_alerts_driver_id ON compliance_alerts(driver_id);
CREATE INDEX idx_compliance_alerts_due_date ON compliance_alerts(due_date);
CREATE INDEX idx_compliance_alerts_acknowledged ON compliance_alerts(acknowledged);

-- Function to calculate driver compliance rate
CREATE OR REPLACE FUNCTION calculate_driver_compliance_rate(driver_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_requirements INTEGER;
    compliant_requirements INTEGER;
    compliance_rate DECIMAL(5,2);
BEGIN
    -- Count total mandatory requirements for this driver
    SELECT COUNT(*)
    INTO total_requirements
    FROM dot_compliance_requirements dcr
    JOIN driver_compliance_status dcs ON dcr.id = dcs.requirement_id
    WHERE dcs.driver_id = driver_uuid AND dcr.mandatory = true;
    
    -- Count compliant requirements
    SELECT COUNT(*)
    INTO compliant_requirements
    FROM dot_compliance_requirements dcr
    JOIN driver_compliance_status dcs ON dcr.id = dcs.requirement_id
    WHERE dcs.driver_id = driver_uuid 
      AND dcr.mandatory = true 
      AND dcs.status = 'compliant'
      AND (dcs.expiration_date IS NULL OR dcs.expiration_date > CURRENT_DATE);
    
    -- Calculate compliance rate
    IF total_requirements > 0 THEN
        compliance_rate := (compliant_requirements::DECIMAL / total_requirements::DECIMAL) * 100;
    ELSE
        compliance_rate := 100.00;
    END IF;
    
    RETURN compliance_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to generate compliance alerts
CREATE OR REPLACE FUNCTION generate_compliance_alerts()
RETURNS VOID AS $$
BEGIN
    -- Clear old unacknowledged alerts
    DELETE FROM compliance_alerts 
    WHERE acknowledged = false AND created_at < (CURRENT_DATE - INTERVAL '30 days');
    
    -- Generate expiration warnings (30 days before expiration)
    INSERT INTO compliance_alerts (
        alert_type, priority, driver_id, requirement_id, title, message, due_date
    )
    SELECT 
        'expiration_warning',
        CASE 
            WHEN dcs.expiration_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'high'
            WHEN dcs.expiration_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'medium'
            ELSE 'low'
        END,
        dcs.driver_id,
        dcs.requirement_id,
        'Compliance Requirement Expiring Soon',
        dcr.requirement_name || ' expires on ' || dcs.expiration_date::TEXT,
        dcs.expiration_date
    FROM driver_compliance_status dcs
    JOIN dot_compliance_requirements dcr ON dcs.requirement_id = dcr.id
    JOIN drivers_enhanced de ON dcs.driver_id = de.id
    WHERE dcs.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND dcs.status = 'compliant'
      AND de.employment_status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM compliance_alerts ca 
          WHERE ca.driver_id = dcs.driver_id 
            AND ca.requirement_id = dcs.requirement_id 
            AND ca.alert_type = 'expiration_warning'
            AND ca.acknowledged = false
      );
    
    -- Generate overdue alerts
    INSERT INTO compliance_alerts (
        alert_type, priority, driver_id, requirement_id, title, message, due_date
    )
    SELECT 
        'overdue',
        'critical',
        dcs.driver_id,
        dcs.requirement_id,
        'Compliance Requirement Overdue',
        dcr.requirement_name || ' expired on ' || dcs.expiration_date::TEXT,
        dcs.expiration_date
    FROM driver_compliance_status dcs
    JOIN dot_compliance_requirements dcr ON dcs.requirement_id = dcr.id
    JOIN drivers_enhanced de ON dcs.driver_id = de.id
    WHERE dcs.expiration_date < CURRENT_DATE
      AND dcs.status != 'non_compliant'
      AND de.employment_status = 'active'
      AND NOT EXISTS (
          SELECT 1 FROM compliance_alerts ca 
          WHERE ca.driver_id = dcs.driver_id 
            AND ca.requirement_id = dcs.requirement_id 
            AND ca.alert_type = 'overdue'
            AND ca.acknowledged = false
      );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update compliance status when requirements change
CREATE OR REPLACE FUNCTION update_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the driver compliance status to overdue if past expiration
    IF NEW.expiration_date IS NOT NULL AND NEW.expiration_date < CURRENT_DATE THEN
        NEW.status := 'overdue';
    END IF;
    
    -- Update next due date based on frequency
    IF NEW.last_completion_date IS NOT NULL AND OLD.last_completion_date IS DISTINCT FROM NEW.last_completion_date THEN
        UPDATE driver_compliance_status 
        SET next_due_date = NEW.last_completion_date + INTERVAL '1 day' * (
            SELECT frequency_days FROM dot_compliance_requirements 
            WHERE id = NEW.requirement_id
        )
        WHERE id = NEW.id;
    END IF;
    
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_status
    BEFORE UPDATE ON driver_compliance_status
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_status();

-- Create view for compliance dashboard
CREATE VIEW compliance_dashboard_summary AS
SELECT 
    d.id as driver_id,
    d.name as driver_name,
    d.employee_id,
    d.employment_status,
    calculate_driver_compliance_rate(d.id) as compliance_rate,
    COUNT(dcs.id) as total_requirements,
    COUNT(CASE WHEN dcs.status = 'compliant' AND (dcs.expiration_date IS NULL OR dcs.expiration_date > CURRENT_DATE) THEN 1 END) as compliant_requirements,
    COUNT(CASE WHEN dcs.expiration_date < CURRENT_DATE THEN 1 END) as overdue_requirements,
    COUNT(CASE WHEN dcs.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon,
    COUNT(cv.id) as violations_12mo,
    COUNT(CASE WHEN cv.severity IN ('serious', 'critical') THEN 1 END) as serious_violations_12mo,
    MAX(dcs.expiration_date) as next_expiration_date
FROM drivers_enhanced d
LEFT JOIN driver_compliance_status dcs ON d.id = dcs.driver_id
LEFT JOIN dot_compliance_requirements dcr ON dcs.requirement_id = dcr.id AND dcr.mandatory = true
LEFT JOIN compliance_violations cv ON d.id = cv.driver_id AND cv.violation_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY d.id, d.name, d.employee_id, d.employment_status;

-- Create view for audit readiness
CREATE VIEW audit_readiness_report AS
SELECT 
    'Fleet Overview' as section,
    'Total Active Drivers' as metric,
    COUNT(*)::TEXT as value,
    CASE 
        WHEN COUNT(*) > 0 THEN 'info'
        ELSE 'warning'
    END as status
FROM drivers_enhanced WHERE employment_status = 'active'

UNION ALL

SELECT 
    'Compliance Rates' as section,
    'Overall Compliance Rate' as metric,
    ROUND(AVG(compliance_rate), 2)::TEXT || '%' as value,
    CASE 
        WHEN AVG(compliance_rate) >= 95 THEN 'success'
        WHEN AVG(compliance_rate) >= 85 THEN 'warning' 
        ELSE 'error'
    END as status
FROM compliance_dashboard_summary WHERE employment_status = 'active'

UNION ALL

SELECT 
    'Risk Factors' as section,
    'Drivers with Overdue Requirements' as metric,
    COUNT(*)::TEXT as value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'success'
        WHEN COUNT(*) <= 3 THEN 'warning'
        ELSE 'error'
    END as status
FROM compliance_dashboard_summary 
WHERE employment_status = 'active' AND overdue_requirements > 0

UNION ALL

SELECT 
    'Risk Factors' as section,
    'Drivers with Recent Violations' as metric,
    COUNT(*)::TEXT as value,
    CASE 
        WHEN COUNT(*) = 0 THEN 'success'
        WHEN COUNT(*) <= 2 THEN 'warning'
        ELSE 'error'
    END as status
FROM compliance_dashboard_summary 
WHERE employment_status = 'active' AND violations_12mo > 0;

-- Function to run daily compliance maintenance
CREATE OR REPLACE FUNCTION daily_compliance_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Update overdue statuses
    UPDATE driver_compliance_status 
    SET status = 'overdue', updated_at = now()
    WHERE expiration_date < CURRENT_DATE AND status != 'overdue';
    
    -- Generate new alerts
    PERFORM generate_compliance_alerts();
    
    -- Update fleet metrics
    INSERT INTO fleet_compliance_metrics (
        metric_date, total_drivers, compliant_drivers, drivers_with_violations,
        pending_requirements, overdue_requirements, overall_compliance_rate
    )
    SELECT 
        CURRENT_DATE,
        COUNT(*) as total_drivers,
        COUNT(CASE WHEN compliance_rate >= 100 THEN 1 END) as compliant_drivers,
        COUNT(CASE WHEN violations_12mo > 0 THEN 1 END) as drivers_with_violations,
        SUM(total_requirements - compliant_requirements) as pending_requirements,
        SUM(overdue_requirements) as overdue_requirements,
        ROUND(AVG(compliance_rate), 2) as overall_compliance_rate
    FROM compliance_dashboard_summary 
    WHERE employment_status = 'active'
    ON CONFLICT (metric_date) DO UPDATE SET
        total_drivers = EXCLUDED.total_drivers,
        compliant_drivers = EXCLUDED.compliant_drivers,
        drivers_with_violations = EXCLUDED.drivers_with_violations,
        pending_requirements = EXCLUDED.pending_requirements,
        overdue_requirements = EXCLUDED.overdue_requirements,
        overall_compliance_rate = EXCLUDED.overall_compliance_rate,
        created_at = now();
END;
$$ LANGUAGE plpgsql;

-- Create unique constraint on fleet_compliance_metrics
ALTER TABLE fleet_compliance_metrics ADD CONSTRAINT unique_metric_date UNIQUE (metric_date);