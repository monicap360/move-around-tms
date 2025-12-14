-- Enable RLS on all major tables
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_code to all company-specific tables
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS organization_code TEXT;

-- Backfill organization_code for all rows (repeat for each org as needed)
UPDATE public.loads SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.drivers SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.trucks SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.tickets SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.materials SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.plants SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.payroll SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;
UPDATE public.reports SET organization_code = 'move-around-tms' WHERE organization_code IS NULL;

UPDATE public.loads SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.drivers SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.trucks SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.tickets SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.materials SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.plants SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.payroll SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;
UPDATE public.reports SET organization_code = 'ronyx-logistics-llc' WHERE organization_code IS NULL;

-- Add indexes for fast org-based queries
CREATE INDEX IF NOT EXISTS idx_loads_org ON public.loads (organization_code);
CREATE INDEX IF NOT EXISTS idx_drivers_org ON public.drivers (organization_code);
CREATE INDEX IF NOT EXISTS idx_trucks_org ON public.trucks (organization_code);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON public.tickets (organization_code);
CREATE INDEX IF NOT EXISTS idx_payroll_org ON public.payroll (organization_code);
CREATE INDEX IF NOT EXISTS idx_reports_org ON public.reports (organization_code);

-- Service role bypass RLS policy for each table
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.loads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.trucks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.plants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS service_role_bypass ON public.organizations FOR ALL USING (true) WITH CHECK (true);

-- Add driver_uuid to drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS driver_uuid uuid DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_driver_uuid ON public.drivers (driver_uuid);

-- Add ticket_uuid to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ticket_uuid uuid DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_ticket_uuid ON public.tickets (ticket_uuid);
