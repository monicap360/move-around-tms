-- Driver Performance Tracking System Schema
-- This creates comprehensive performance monitoring for drivers including safety scores, 
-- violations, incidents, KPIs, and metrics tracking
-- Compatible with Supabase/PostgreSQL

-- Create performance metrics table for historical tracking
CREATE TABLE IF NOT EXISTS driver_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    
    -- Performance Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
    
    -- Safety Metrics
    safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
    accidents_count INTEGER DEFAULT 0,
    violations_count INTEGER DEFAULT 0,
    inspections_count INTEGER DEFAULT 0,
    out_of_service_count INTEGER DEFAULT 0,
    
    -- Operational Metrics
    miles_driven DECIMAL(12,2) DEFAULT 0,
    trips_completed INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,
    fuel_consumed DECIMAL(10,2) DEFAULT 0,
    fuel_efficiency DECIMAL(5,2), -- MPG
    
    -- Financial Metrics
    revenue_generated DECIMAL(12,2) DEFAULT 0,
    cost_per_mile DECIMAL(5,2),
    profit_margin DECIMAL(5,2),
    
    -- Time Metrics
    driving_hours DECIMAL(6,2) DEFAULT 0,
    on_duty_hours DECIMAL(6,2) DEFAULT 0,
    available_hours DECIMAL(6,2) DEFAULT 0,
    
    -- Quality Metrics
    customer_rating DECIMAL(3,2), -- 1.0 to 5.0 scale
    damage_incidents INTEGER DEFAULT 0,
    cargo_claims INTEGER DEFAULT 0,
    
    -- Calculated Fields
    on_time_percentage DECIMAL(5,2),
    accident_rate DECIMAL(8,4), -- accidents per million miles
    violation_rate DECIMAL(8,4), -- violations per million miles
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_id, period_start, period_end, period_type)
);

-- Create incidents tracking table
CREATE TABLE IF NOT EXISTS driver_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    
    -- Incident Details
    incident_date DATE NOT NULL,
    incident_time TIME,
    incident_type VARCHAR(50) NOT NULL, -- 'Accident', 'Violation', 'Inspection', 'Complaint', 'Commendation'
    severity VARCHAR(20) DEFAULT 'Minor' CHECK (severity IN ('Minor', 'Major', 'Severe', 'Critical')),
    
    -- Location
    location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    
    -- Description
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Impact Assessment
    preventable BOOLEAN,
    driver_fault BOOLEAN,
    injury_involved BOOLEAN DEFAULT FALSE,
    property_damage BOOLEAN DEFAULT FALSE,
    estimated_cost DECIMAL(10,2),
    
    -- Regulatory
    dot_reportable BOOLEAN DEFAULT FALSE,
    citation_number VARCHAR(100),
    fine_amount DECIMAL(8,2),
    court_date DATE,
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Closed')),
    resolution TEXT,
    corrective_action TEXT,
    
    -- Impact on Safety Score
    safety_score_impact INTEGER DEFAULT 0, -- Points deducted/added
    
    -- Attachments and Evidence
    photos JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Tracking
    reported_by VARCHAR(255),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create violations tracking table
CREATE TABLE IF NOT EXISTS driver_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    
    -- Violation Details
    violation_date DATE NOT NULL,
    violation_code VARCHAR(50),
    violation_description TEXT NOT NULL,
    violation_type VARCHAR(50), -- 'Moving', 'Non-Moving', 'HOS', 'Vehicle', 'Hazmat', etc.
    
    -- Severity and Impact
    severity VARCHAR(20) DEFAULT 'Minor' CHECK (severity IN ('Minor', 'Serious', 'Severe')),
    csm_points DECIMAL(3,1), -- CSA points
    fine_amount DECIMAL(8,2),
    
    -- Location
    location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    
    -- Legal Status
    citation_number VARCHAR(100),
    court_date DATE,
    court_result VARCHAR(50), -- 'Guilty', 'Not Guilty', 'Reduced', 'Dismissed', 'Pending'
    attorney_involved BOOLEAN DEFAULT FALSE,
    
    -- Company Impact
    preventable BOOLEAN,
    training_required BOOLEAN DEFAULT FALSE,
    policy_violation BOOLEAN DEFAULT FALSE,
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Under Appeal', 'Dismissed')),
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create safety training records
CREATE TABLE IF NOT EXISTS driver_safety_training (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    
    -- Training Details
    training_date DATE NOT NULL,
    training_type VARCHAR(100) NOT NULL, -- 'Defensive Driving', 'HOS', 'Safety Meeting', etc.
    training_topic VARCHAR(255),
    instructor VARCHAR(255),
    duration_hours DECIMAL(4,2),
    
    -- Completion Status
    status VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Failed', 'No Show')),
    score DECIMAL(5,2), -- Test score if applicable
    passing_score DECIMAL(5,2),
    
    -- Certification
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_number VARCHAR(100),
    expiration_date DATE,
    
    -- Mandatory vs Voluntary
    required_training BOOLEAN DEFAULT FALSE,
    reason_for_training VARCHAR(100), -- 'Violation', 'Incident', 'Refresher', 'New Hire', 'Voluntary'
    
    -- Documentation
    training_materials JSONB DEFAULT '[]'::jsonb,
    completion_certificate JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance goals and targets
CREATE TABLE IF NOT EXISTS driver_performance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    
    -- Goal Details
    goal_type VARCHAR(50) NOT NULL, -- 'Safety Score', 'Fuel Efficiency', 'On-Time %', etc.
    goal_description VARCHAR(255) NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2),
    unit VARCHAR(20), -- 'score', 'mpg', 'percentage', 'miles', etc.
    
    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_frequency VARCHAR(20) DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly'
    
    -- Status
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Achieved', 'Not Met', 'Cancelled')),
    achievement_date DATE,
    
    -- Incentives
    incentive_amount DECIMAL(8,2),
    incentive_type VARCHAR(50), -- 'Bonus', 'Time Off', 'Recognition', etc.
    incentive_paid BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    assigned_by VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance reviews table
CREATE TABLE IF NOT EXISTS driver_performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    
    -- Review Details
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type VARCHAR(50) DEFAULT 'Regular' CHECK (review_type IN ('Regular', 'Probationary', 'Annual', 'Incident-Based')),
    
    -- Reviewer Information
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_title VARCHAR(100),
    review_date DATE NOT NULL,
    
    -- Performance Ratings (1-5 scale)
    safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    compliance_rating INTEGER CHECK (compliance_rating >= 1 AND compliance_rating <= 5),
    
    -- Overall Assessment
    overall_rating DECIMAL(3,2), -- Calculated average
    overall_comments TEXT,
    
    -- Strengths and Areas for Improvement
    strengths TEXT,
    areas_for_improvement TEXT,
    goals_for_next_period TEXT,
    
    -- Action Items
    training_recommendations TEXT,
    disciplinary_action BOOLEAN DEFAULT FALSE,
    disciplinary_notes TEXT,
    
    -- Follow-up
    next_review_date DATE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    
    -- Signatures
    driver_acknowledged BOOLEAN DEFAULT FALSE,
    driver_signature_date DATE,
    reviewer_signature_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_driver_period ON driver_performance_metrics(driver_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_incidents_driver_date ON driver_incidents(driver_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_violations_driver_date ON driver_violations(driver_id, violation_date);
CREATE INDEX IF NOT EXISTS idx_safety_training_driver_date ON driver_safety_training(driver_id, training_date);
CREATE INDEX IF NOT EXISTS idx_performance_goals_driver_status ON driver_performance_goals(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_driver_date ON driver_performance_reviews(driver_id, review_date);

-- Create view for current driver performance summary
CREATE OR REPLACE VIEW driver_performance_summary AS
SELECT 
    de.id as driver_id,
    de.name as driver_name,
    de.employee_id,
    de.safety_score as current_safety_score,
    
    -- Current Period Metrics (Last 30 days)
    COALESCE(recent_metrics.miles_driven, 0) as recent_miles,
    COALESCE(recent_metrics.fuel_efficiency, 0) as recent_mpg,
    COALESCE(recent_metrics.on_time_percentage, 0) as recent_on_time_pct,
    
    -- Incident Counts (Last 12 months)
    COALESCE(incident_summary.total_incidents, 0) as incidents_12mo,
    COALESCE(incident_summary.accidents, 0) as accidents_12mo,
    COALESCE(violation_summary.total_violations, 0) as violations_12mo,
    
    -- Training Status
    COALESCE(training_summary.trainings_completed, 0) as trainings_ytd,
    training_summary.last_training_date,
    
    -- Performance Goals
    COALESCE(goals_summary.active_goals, 0) as active_goals,
    COALESCE(goals_summary.achieved_goals, 0) as achieved_goals,
    
    -- Last Review
    pr.review_date as last_review_date,
    pr.overall_rating as last_review_rating,
    
    de.status as employment_status
    
FROM drivers_enhanced de

-- Recent Performance Metrics (Last 30 days)
LEFT JOIN (
    SELECT 
        driver_id,
        SUM(miles_driven) as miles_driven,
        AVG(fuel_efficiency) as fuel_efficiency,
        AVG(on_time_percentage) as on_time_percentage
    FROM driver_performance_metrics 
    WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY driver_id
) recent_metrics ON de.id = recent_metrics.driver_id

-- Incident Summary (Last 12 months)
LEFT JOIN (
    SELECT 
        driver_id,
        COUNT(*) as total_incidents,
        COUNT(CASE WHEN incident_type = 'Accident' THEN 1 END) as accidents
    FROM driver_incidents 
    WHERE incident_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY driver_id
) incident_summary ON de.id = incident_summary.driver_id

-- Violation Summary (Last 12 months)
LEFT JOIN (
    SELECT 
        driver_id,
        COUNT(*) as total_violations
    FROM driver_violations 
    WHERE violation_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY driver_id
) violation_summary ON de.id = violation_summary.driver_id

-- Training Summary (Current year)
LEFT JOIN (
    SELECT 
        driver_id,
        COUNT(*) as trainings_completed,
        MAX(training_date) as last_training_date
    FROM driver_safety_training 
    WHERE status = 'Completed'
      AND EXTRACT(YEAR FROM training_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY driver_id
) training_summary ON de.id = training_summary.driver_id

-- Goals Summary
LEFT JOIN (
    SELECT 
        driver_id,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_goals,
        COUNT(CASE WHEN status = 'Achieved' THEN 1 END) as achieved_goals
    FROM driver_performance_goals
    GROUP BY driver_id
) goals_summary ON de.id = goals_summary.driver_id

-- Last Performance Review
LEFT JOIN (
    SELECT DISTINCT ON (driver_id)
        driver_id,
        review_date,
        overall_rating
    FROM driver_performance_reviews
    ORDER BY driver_id, review_date DESC
) pr ON de.id = pr.driver_id

WHERE de.status = 'Active';

-- Create view for safety alerts and warnings
CREATE OR REPLACE VIEW driver_safety_alerts AS
SELECT 
    de.id as driver_id,
    de.name as driver_name,
    de.employee_id,
    'Low Safety Score' as alert_type,
    'Critical' as severity,
    'Safety score below 70: ' || de.safety_score::text as message,
    CURRENT_DATE as alert_date
FROM drivers_enhanced de 
WHERE de.safety_score < 70 
  AND de.status = 'Active'

UNION ALL

SELECT 
    de.id,
    de.name,
    de.employee_id,
    'Recent Violations' as alert_type,
    CASE WHEN recent_violations >= 3 THEN 'Critical' ELSE 'Warning' END as severity,
    recent_violations::text || ' violations in last 6 months' as message,
    CURRENT_DATE as alert_date
FROM drivers_enhanced de
JOIN (
    SELECT 
        driver_id,
        COUNT(*) as recent_violations
    FROM driver_violations 
    WHERE violation_date >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY driver_id
    HAVING COUNT(*) >= 2
) viol ON de.id = viol.driver_id
WHERE de.status = 'Active'

UNION ALL

SELECT 
    de.id,
    de.name,
    de.employee_id,
    'Training Overdue' as alert_type,
    'Warning' as severity,
    'No safety training in last 12 months' as message,
    CURRENT_DATE as alert_date
FROM drivers_enhanced de
LEFT JOIN driver_safety_training dst ON de.id = dst.driver_id 
    AND dst.training_date >= CURRENT_DATE - INTERVAL '12 months'
    AND dst.status = 'Completed'
WHERE dst.id IS NULL 
  AND de.status = 'Active'
  AND de.hire_date < CURRENT_DATE - INTERVAL '12 months';

-- Function to calculate and update safety scores
CREATE OR REPLACE FUNCTION calculate_safety_score(p_driver_id UUID)
RETURNS INTEGER AS $$
DECLARE
    base_score INTEGER := 100;
    violation_penalty INTEGER := 0;
    accident_penalty INTEGER := 0;
    training_bonus INTEGER := 0;
    final_score INTEGER;
BEGIN
    -- Deduct points for violations in last 24 months
    SELECT COALESCE(SUM(
        CASE 
            WHEN severity = 'Minor' THEN 2
            WHEN severity = 'Serious' THEN 5
            WHEN severity = 'Severe' THEN 10
            ELSE 3
        END
    ), 0) INTO violation_penalty
    FROM driver_violations 
    WHERE driver_id = p_driver_id 
      AND violation_date >= CURRENT_DATE - INTERVAL '24 months';
    
    -- Deduct points for accidents in last 36 months
    SELECT COALESCE(SUM(
        CASE 
            WHEN severity = 'Minor' THEN 5
            WHEN severity = 'Major' THEN 15
            WHEN severity = 'Severe' THEN 25
            WHEN severity = 'Critical' THEN 40
            ELSE 10
        END
    ), 0) INTO accident_penalty
    FROM driver_incidents 
    WHERE driver_id = p_driver_id 
      AND incident_type = 'Accident'
      AND incident_date >= CURRENT_DATE - INTERVAL '36 months';
    
    -- Add bonus for recent safety training
    SELECT CASE 
        WHEN COUNT(*) >= 4 THEN 5
        WHEN COUNT(*) >= 2 THEN 3
        WHEN COUNT(*) >= 1 THEN 1
        ELSE 0
    END INTO training_bonus
    FROM driver_safety_training 
    WHERE driver_id = p_driver_id 
      AND training_date >= CURRENT_DATE - INTERVAL '12 months'
      AND status = 'Completed';
    
    -- Calculate final score
    final_score := base_score - violation_penalty - accident_penalty + training_bonus;
    
    -- Ensure score is between 0 and 100
    final_score := GREATEST(0, LEAST(100, final_score));
    
    -- Update driver record
    UPDATE drivers_enhanced 
    SET safety_score = final_score,
        updated_at = NOW()
    WHERE id = p_driver_id;
    
    RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update performance metrics
CREATE OR REPLACE FUNCTION update_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate safety score when violations or incidents change
    IF TG_TABLE_NAME IN ('driver_violations', 'driver_incidents', 'driver_safety_training') THEN
        PERFORM calculate_safety_score(NEW.driver_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update safety scores
DROP TRIGGER IF EXISTS trigger_update_safety_score_violations ON driver_violations;
CREATE TRIGGER trigger_update_safety_score_violations
    AFTER INSERT OR UPDATE ON driver_violations
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_metrics();

DROP TRIGGER IF EXISTS trigger_update_safety_score_incidents ON driver_incidents;
CREATE TRIGGER trigger_update_safety_score_incidents
    AFTER INSERT OR UPDATE ON driver_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_metrics();

DROP TRIGGER IF EXISTS trigger_update_safety_score_training ON driver_safety_training;
CREATE TRIGGER trigger_update_safety_score_training
    AFTER INSERT OR UPDATE ON driver_safety_training
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_metrics();

-- Insert sample performance data for testing
DO $$
DECLARE
    sample_driver_id UUID;
BEGIN
    -- Get a sample driver ID
    SELECT id INTO sample_driver_id FROM drivers_enhanced LIMIT 1;
    
    IF sample_driver_id IS NOT NULL THEN
        -- Insert sample performance metrics
        INSERT INTO driver_performance_metrics (
            driver_id, period_start, period_end, period_type,
            safety_score, miles_driven, trips_completed, on_time_deliveries, late_deliveries,
            fuel_consumed, fuel_efficiency, on_time_percentage
        ) VALUES 
        (sample_driver_id, '2025-10-01', '2025-10-31', 'monthly', 95, 8500.00, 25, 23, 2, 1700.00, 5.0, 92.0),
        (sample_driver_id, '2025-09-01', '2025-09-30', 'monthly', 92, 9200.00, 28, 26, 2, 1840.00, 5.2, 92.9);
        
        -- Insert sample safety training
        INSERT INTO driver_safety_training (
            driver_id, training_date, training_type, training_topic, 
            duration_hours, status, required_training
        ) VALUES 
        (sample_driver_id, '2025-08-15', 'Safety Meeting', 'Defensive Driving Techniques', 2.0, 'Completed', false),
        (sample_driver_id, '2025-06-20', 'HOS Training', 'Hours of Service Regulations Update', 1.5, 'Completed', true);
    END IF;
END $$;