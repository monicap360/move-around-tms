-- Create maintenance_requests table for driver-initiated truck issues
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  truck_id UUID REFERENCES public.trucks(id) ON DELETE SET NULL,
  truck_number TEXT,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'Engine/Mechanical',
    'Brakes',
    'Tires',
    'Lights/Electrical',
    'HVAC/Climate',
    'Transmission',
    'Suspension',
    'Body/Exterior',
    'Interior',
    'Safety Equipment',
    'Other'
  )),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  description TEXT NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb,
  location TEXT,
  mileage INTEGER,
  can_drive_safely BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
    'Pending',
    'Acknowledged',
    'Scheduled',
    'In Progress',
    'Completed',
    'Cancelled'
  )),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  mechanic_notes TEXT,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  downtime_hours INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trucks table if it doesn't exist (for reference)
CREATE TABLE IF NOT EXISTS public.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_number TEXT UNIQUE NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  license_plate TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'In Maintenance', 'Out of Service', 'Retired')),
  current_mileage INTEGER,
  last_service_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add current_truck_id to drivers if not exists
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS current_truck_id UUID REFERENCES public.trucks(id);

-- Create indexes for maintenance requests
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_driver 
ON public.maintenance_requests(driver_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_truck 
ON public.maintenance_requests(truck_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status 
ON public.maintenance_requests(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_priority 
ON public.maintenance_requests(priority, status);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_submitted 
ON public.maintenance_requests(submitted_at DESC);

-- Create view for pending maintenance dashboard
CREATE OR REPLACE VIEW public.maintenance_dashboard AS
SELECT 
  mr.id,
  mr.truck_number,
  mr.issue_type,
  mr.priority,
  mr.description,
  mr.can_drive_safely,
  mr.status,
  mr.submitted_at,
  mr.scheduled_date,
  mr.mileage,
  mr.location,
  d.name AS driver_name,
  d.phone AS driver_phone,
  t.make,
  t.model,
  t.year,
  EXTRACT(EPOCH FROM (NOW() - mr.submitted_at)) / 3600 AS hours_pending
FROM maintenance_requests mr
LEFT JOIN drivers d ON mr.driver_id = d.id
LEFT JOIN trucks t ON mr.truck_id = t.id
WHERE mr.status IN ('Pending', 'Acknowledged', 'Scheduled', 'In Progress')
ORDER BY 
  CASE mr.priority 
    WHEN 'Critical' THEN 1
    WHEN 'High' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Low' THEN 4
  END,
  mr.submitted_at ASC;

-- Add RLS policies for maintenance requests
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own requests
CREATE POLICY maintenance_requests_driver_select 
ON public.maintenance_requests 
FOR SELECT 
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE email = auth.jwt()->>'email'
  )
);

-- Drivers can insert their own requests
CREATE POLICY maintenance_requests_driver_insert 
ON public.maintenance_requests 
FOR INSERT 
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE email = auth.jwt()->>'email'
  )
);

-- Managers/admins can view all requests
CREATE POLICY maintenance_requests_manager_all 
ON public.maintenance_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('owner', 'admin', 'manager')
  )
);

-- Function to update truck status when maintenance request is created
CREATE OR REPLACE FUNCTION update_truck_status_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  -- If critical and can't drive safely, mark truck as out of service
  IF NEW.priority = 'Critical' AND NEW.can_drive_safely = FALSE THEN
    UPDATE trucks 
    SET status = 'Out of Service'
    WHERE id = NEW.truck_id;
  -- If high/medium priority, mark as in maintenance
  ELSIF NEW.priority IN ('High', 'Medium') THEN
    UPDATE trucks 
    SET status = 'In Maintenance'
    WHERE id = NEW.truck_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_truck_status
AFTER INSERT ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION update_truck_status_on_maintenance();

-- Function to notify managers of new maintenance requests
CREATE OR REPLACE FUNCTION notify_managers_maintenance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (message, metadata)
  VALUES (
    format('🔧 New %s maintenance request from %s: %s - Truck %s', 
      NEW.priority,
      (SELECT name FROM drivers WHERE id = NEW.driver_id),
      NEW.issue_type,
      NEW.truck_number
    ),
    jsonb_build_object(
      'type', 'maintenance_request',
      'request_id', NEW.id,
      'driver_id', NEW.driver_id,
      'priority', NEW.priority,
      'can_drive_safely', NEW.can_drive_safely
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_maintenance
AFTER INSERT ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION notify_managers_maintenance();

-- Add comments
COMMENT ON TABLE public.maintenance_requests IS 'Driver-initiated maintenance requests for trucks';
COMMENT ON COLUMN public.maintenance_requests.can_drive_safely IS 'False if truck should be taken out of service immediately';
COMMENT ON COLUMN public.maintenance_requests.photos IS 'Array of photo URLs showing the issue';
COMMENT ON VIEW public.maintenance_dashboard IS 'Active maintenance requests with driver and truck details for manager dashboard';
