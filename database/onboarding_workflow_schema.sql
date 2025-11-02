-- Driver Onboarding Workflow Schema
-- This creates a comprehensive onboarding checklist system for new drivers
-- Compatible with Supabase/PostgreSQL

-- Create onboarding templates table (defines the steps for different driver types)
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    driver_type VARCHAR(50), -- 'OTR', 'Local', 'Dedicated', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create onboarding steps table (individual checklist items)
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'Documentation', 'Training', 'Equipment', 'HR', etc.
    required_for_activation BOOLEAN DEFAULT TRUE,
    estimated_duration_minutes INTEGER,
    assigned_department VARCHAR(50), -- 'HR', 'Safety', 'Operations', etc.
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create driver onboarding instances (tracks individual driver progress)
CREATE TABLE IF NOT EXISTS driver_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers_enhanced(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES onboarding_templates(id),
    status VARCHAR(20) DEFAULT 'In Progress' CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled')),
    started_date TIMESTAMPTZ DEFAULT NOW(),
    target_completion_date DATE,
    actual_completion_date TIMESTAMPTZ,
    assigned_hr_rep VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id) -- One onboarding per driver
);

-- Create step completion tracking
CREATE TABLE IF NOT EXISTS onboarding_step_completion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID NOT NULL REFERENCES driver_onboarding(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Skipped', 'Failed')),
    completed_by VARCHAR(255),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    required_documents JSONB DEFAULT '[]'::jsonb, -- Array of required document types
    uploaded_documents JSONB DEFAULT '[]'::jsonb, -- Array of uploaded document IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(onboarding_id, step_id)
);

-- Create onboarding document requirements
CREATE TABLE IF NOT EXISTS onboarding_document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_driver_id ON driver_onboarding(driver_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON driver_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_step_completion_onboarding_id ON onboarding_step_completion(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_step_completion_status ON onboarding_step_completion(status);

-- Create view for onboarding progress summary
CREATE OR REPLACE VIEW onboarding_progress_summary AS
SELECT 
    do.id as onboarding_id,
    do.driver_id,
    de.name as driver_name,
    de.employee_id,
    do.status as onboarding_status,
    do.started_date,
    do.target_completion_date,
    do.actual_completion_date,
    do.assigned_hr_rep,
    ot.name as template_name,
    COUNT(osc.id) as total_steps,
    COUNT(CASE WHEN osc.status = 'Completed' THEN 1 END) as completed_steps,
    COUNT(CASE WHEN osc.status = 'Failed' THEN 1 END) as failed_steps,
    COUNT(CASE WHEN os.required_for_activation = TRUE AND osc.status != 'Completed' THEN 1 END) as blocking_steps,
    ROUND(
        (COUNT(CASE WHEN osc.status = 'Completed' THEN 1 END)::DECIMAL / COUNT(osc.id)::DECIMAL) * 100, 
        2
    ) as completion_percentage
FROM driver_onboarding do
JOIN drivers_enhanced de ON do.driver_id = de.id
JOIN onboarding_templates ot ON do.template_id = ot.id
LEFT JOIN onboarding_step_completion osc ON do.id = osc.onboarding_id
LEFT JOIN onboarding_steps os ON osc.step_id = os.id
GROUP BY do.id, de.name, de.employee_id, do.status, do.started_date, 
         do.target_completion_date, do.actual_completion_date, do.assigned_hr_rep, ot.name;

-- Create view for overdue onboarding tasks
CREATE OR REPLACE VIEW overdue_onboarding_tasks AS
SELECT 
    do.id as onboarding_id,
    de.name as driver_name,
    de.employee_id,
    os.title as step_title,
    os.category,
    os.assigned_department,
    osc.status as step_status,
    do.target_completion_date,
    CURRENT_DATE - do.target_completion_date as days_overdue
FROM driver_onboarding do
JOIN drivers_enhanced de ON do.driver_id = de.id
JOIN onboarding_step_completion osc ON do.id = osc.onboarding_id
JOIN onboarding_steps os ON osc.step_id = os.id
WHERE do.target_completion_date < CURRENT_DATE
  AND do.status IN ('Not Started', 'In Progress')
  AND osc.status NOT IN ('Completed', 'Skipped')
  AND os.required_for_activation = TRUE
ORDER BY days_overdue DESC;

-- Insert default onboarding templates
INSERT INTO onboarding_templates (name, description, driver_type) VALUES 
('Standard OTR Driver Onboarding', 'Complete onboarding process for Over-The-Road drivers', 'OTR'),
('Local Driver Onboarding', 'Streamlined onboarding for local delivery drivers', 'Local'),
('Dedicated Route Driver Onboarding', 'Onboarding for dedicated route drivers', 'Dedicated')
ON CONFLICT DO NOTHING;

-- Get template IDs for step insertion
DO $$
DECLARE
    otr_template_id UUID;
    local_template_id UUID;
    dedicated_template_id UUID;
BEGIN
    SELECT id INTO otr_template_id FROM onboarding_templates WHERE driver_type = 'OTR' LIMIT 1;
    SELECT id INTO local_template_id FROM onboarding_templates WHERE driver_type = 'Local' LIMIT 1;
    SELECT id INTO dedicated_template_id FROM onboarding_templates WHERE driver_type = 'Dedicated' LIMIT 1;

    -- Insert OTR driver onboarding steps
    INSERT INTO onboarding_steps (template_id, step_order, title, description, category, required_for_activation, estimated_duration_minutes, assigned_department, instructions) VALUES 
    (otr_template_id, 1, 'Complete Employment Application', 'Fill out and submit complete employment application', 'HR', true, 30, 'HR', 'Driver completes application online or in-person'),
    (otr_template_id, 2, 'Background Check Authorization', 'Sign authorization for background check', 'HR', true, 15, 'HR', 'Obtain signed consent for background investigation'),
    (otr_template_id, 3, 'Drug & Alcohol Testing', 'Complete pre-employment drug and alcohol screening', 'Safety', true, 60, 'Safety', 'Schedule and complete DOT-required testing'),
    (otr_template_id, 4, 'CDL Verification', 'Verify CDL license and endorsements', 'Safety', true, 15, 'Safety', 'Check CDL status and required endorsements'),
    (otr_template_id, 5, 'DOT Physical Examination', 'Complete DOT physical and obtain medical certificate', 'Safety', true, 90, 'Safety', 'Schedule with approved medical examiner'),
    (otr_template_id, 6, 'Road Test Evaluation', 'Complete company road test and skills assessment', 'Safety', true, 120, 'Safety', 'Conduct comprehensive driving evaluation'),
    (otr_template_id, 7, 'Safety Orientation', 'Complete comprehensive safety training program', 'Training', true, 480, 'Safety', 'Cover company safety policies and procedures'),
    (otr_template_id, 8, 'HOS Training', 'Hours of Service regulations training', 'Training', true, 120, 'Safety', 'Training on DOT Hours of Service rules'),
    (otr_template_id, 9, 'ELD Training', 'Electronic Logging Device training', 'Training', true, 60, 'Operations', 'Hands-on ELD system training'),
    (otr_template_id, 10, 'Company Policies Review', 'Review employee handbook and company policies', 'HR', true, 60, 'HR', 'Go through handbook and obtain acknowledgments'),
    (otr_template_id, 11, 'Equipment Assignment', 'Assign truck and trailer, complete inspection', 'Operations', true, 90, 'Operations', 'Assign equipment and conduct walkthrough'),
    (otr_template_id, 12, 'Payroll Setup', 'Complete payroll and benefits enrollment', 'HR', true, 45, 'HR', 'Set up direct deposit and benefit selections'),
    (otr_template_id, 13, 'Fuel Card Assignment', 'Issue fuel card and provide training', 'Operations', false, 30, 'Operations', 'Provide fuel card and usage instructions'),
    (otr_template_id, 14, 'First Load Assignment', 'Assign and dispatch first load', 'Operations', false, 30, 'Operations', 'Coordinate first trip assignment'),
    (otr_template_id, 15, 'Follow-up Check', '30-day follow-up with new driver', 'HR', false, 30, 'HR', 'Schedule 30-day check-in meeting');

    -- Insert Local driver onboarding steps (streamlined)
    INSERT INTO onboarding_steps (template_id, step_order, title, description, category, required_for_activation, estimated_duration_minutes, assigned_department, instructions) VALUES 
    (local_template_id, 1, 'Complete Employment Application', 'Fill out and submit complete employment application', 'HR', true, 30, 'HR', 'Driver completes application online or in-person'),
    (local_template_id, 2, 'Background Check Authorization', 'Sign authorization for background check', 'HR', true, 15, 'HR', 'Obtain signed consent for background investigation'),
    (local_template_id, 3, 'Drug & Alcohol Testing', 'Complete pre-employment drug and alcohol screening', 'Safety', true, 60, 'Safety', 'Schedule and complete DOT-required testing'),
    (local_template_id, 4, 'CDL Verification', 'Verify CDL license and endorsements', 'Safety', true, 15, 'Safety', 'Check CDL status and required endorsements'),
    (local_template_id, 5, 'DOT Physical Examination', 'Complete DOT physical and obtain medical certificate', 'Safety', true, 90, 'Safety', 'Schedule with approved medical examiner'),
    (local_template_id, 6, 'Road Test Evaluation', 'Complete company road test and skills assessment', 'Safety', true, 90, 'Safety', 'Local route driving evaluation'),
    (local_template_id, 7, 'Safety Orientation', 'Complete safety training program', 'Training', true, 240, 'Safety', 'Cover company safety policies and procedures'),
    (local_template_id, 8, 'Route Training', 'Learn assigned routes and customer locations', 'Training', true, 180, 'Operations', 'Hands-on route familiarization'),
    (local_template_id, 9, 'Company Policies Review', 'Review employee handbook and company policies', 'HR', true, 45, 'HR', 'Go through handbook and obtain acknowledgments'),
    (local_template_id, 10, 'Equipment Assignment', 'Assign vehicle and conduct inspection', 'Operations', true, 60, 'Operations', 'Assign vehicle and conduct walkthrough'),
    (local_template_id, 11, 'Payroll Setup', 'Complete payroll and benefits enrollment', 'HR', true, 45, 'HR', 'Set up direct deposit and benefit selections'),
    (local_template_id, 12, 'First Route Assignment', 'Complete first supervised route', 'Operations', false, 240, 'Operations', 'Supervised first day on route');

END $$;

-- Create function to automatically create onboarding when driver is added
CREATE OR REPLACE FUNCTION create_driver_onboarding()
RETURNS TRIGGER AS $$
DECLARE
    template_id UUID;
    onboarding_id UUID;
    step_rec RECORD;
BEGIN
    -- Determine template based on driver position or default to OTR
    SELECT id INTO template_id 
    FROM onboarding_templates 
    WHERE (
        CASE 
            WHEN NEW.position ILIKE '%local%' THEN driver_type = 'Local'
            WHEN NEW.position ILIKE '%dedicated%' THEN driver_type = 'Dedicated'
            ELSE driver_type = 'OTR'
        END
    )
    AND is_active = TRUE
    LIMIT 1;
    
    -- If no specific template found, use OTR as default
    IF template_id IS NULL THEN
        SELECT id INTO template_id 
        FROM onboarding_templates 
        WHERE driver_type = 'OTR' 
        AND is_active = TRUE 
        LIMIT 1;
    END IF;
    
    -- Create onboarding instance
    IF template_id IS NOT NULL THEN
        INSERT INTO driver_onboarding (
            driver_id, 
            template_id, 
            target_completion_date
        ) VALUES (
            NEW.id, 
            template_id, 
            NEW.hire_date + INTERVAL '14 days'  -- 2 weeks to complete onboarding
        )
        RETURNING id INTO onboarding_id;
        
        -- Create step completion records for all template steps
        FOR step_rec IN 
            SELECT id FROM onboarding_steps 
            WHERE template_id = template_id 
            ORDER BY step_order
        LOOP
            INSERT INTO onboarding_step_completion (
                onboarding_id,
                step_id,
                status
            ) VALUES (
                onboarding_id,
                step_rec.id,
                'Pending'
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-create onboarding for new drivers
DROP TRIGGER IF EXISTS trigger_create_onboarding ON drivers_enhanced;
CREATE TRIGGER trigger_create_onboarding
    AFTER INSERT ON drivers_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION create_driver_onboarding();

-- Function to update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_required_steps INTEGER;
    completed_required_steps INTEGER;
    onboarding_status VARCHAR(20);
BEGIN
    -- Count total and completed required steps
    SELECT 
        COUNT(CASE WHEN os.required_for_activation = TRUE THEN 1 END),
        COUNT(CASE WHEN os.required_for_activation = TRUE AND osc.status = 'Completed' THEN 1 END)
    INTO total_required_steps, completed_required_steps
    FROM onboarding_step_completion osc
    JOIN onboarding_steps os ON osc.step_id = os.id
    WHERE osc.onboarding_id = NEW.onboarding_id;
    
    -- Update onboarding status based on completion
    IF completed_required_steps = total_required_steps THEN
        onboarding_status := 'Completed';
        
        UPDATE driver_onboarding 
        SET status = onboarding_status,
            actual_completion_date = NOW(),
            updated_at = NOW()
        WHERE id = NEW.onboarding_id;
        
        -- Update driver status to Active if onboarding is complete
        UPDATE drivers_enhanced 
        SET status = 'Active'
        WHERE id = (SELECT driver_id FROM driver_onboarding WHERE id = NEW.onboarding_id);
        
    ELSIF completed_required_steps > 0 THEN
        onboarding_status := 'In Progress';
        
        UPDATE driver_onboarding 
        SET status = onboarding_status,
            updated_at = NOW()
        WHERE id = NEW.onboarding_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update onboarding progress when steps are completed
DROP TRIGGER IF EXISTS trigger_update_onboarding_progress ON onboarding_step_completion;
CREATE TRIGGER trigger_update_onboarding_progress
    AFTER UPDATE ON onboarding_step_completion
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_onboarding_progress();