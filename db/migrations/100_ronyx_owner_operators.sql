-- Migration: Owner Operator companies and sub-tables

CREATE TABLE IF NOT EXISTS public.ronyx_owner_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  company_name text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_email text,
  business_address text,
  mc_number text,
  dot_number text,
  ein text,
  insurance_agent_name text,
  insurance_agent_email text,
  insurance_agent_phone text,
  notes text,
  last_contact_date date,
  status text DEFAULT 'active',
  reminder_log jsonb DEFAULT '[]'::jsonb,
  compliance_history jsonb DEFAULT '[]'::jsonb,
  changes_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_oo_company ON public.ronyx_owner_operators(company_name);
CREATE INDEX IF NOT EXISTS idx_ronyx_oo_mc ON public.ronyx_owner_operators(mc_number);

-- OO Drivers
CREATE TABLE IF NOT EXISTS public.ronyx_oo_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oo_id uuid NOT NULL REFERENCES public.ronyx_owner_operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  cdl_number text,
  cdl_state text DEFAULT 'TX',
  cdl_expiration date,
  med_card_expiration date,
  med_card_number text,
  truck_number text,
  job_assignment text,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_oo_drivers_oo ON public.ronyx_oo_drivers(oo_id);

-- OO Trucks
CREATE TABLE IF NOT EXISTS public.ronyx_oo_trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oo_id uuid NOT NULL REFERENCES public.ronyx_owner_operators(id) ON DELETE CASCADE,
  truck_number text NOT NULL,
  year text,
  make text,
  model text,
  vin text,
  last_inspection date,
  inspection_result text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_oo_trucks_oo ON public.ronyx_oo_trucks(oo_id);

-- OO Documents
CREATE TABLE IF NOT EXISTS public.ronyx_oo_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oo_id uuid NOT NULL REFERENCES public.ronyx_owner_operators(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_name text,
  file_url text,
  expires_on date,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_oo_docs_oo ON public.ronyx_oo_documents(oo_id);

-- OO Jobs (Domino Project assignments etc.)
CREATE TABLE IF NOT EXISTS public.ronyx_oo_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oo_id uuid NOT NULL REFERENCES public.ronyx_owner_operators(id) ON DELETE CASCADE,
  project_name text,
  project_number text,
  load_date date,
  truck_number text,
  driver_name text,
  origin text,
  destination text,
  material text,
  tons numeric(10,2),
  gross_revenue numeric(12,2),
  oo_rate numeric(12,2),
  margin numeric(12,2),
  ticket_status text DEFAULT 'Verified',
  settlement_status text DEFAULT 'Pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_oo_jobs_oo ON public.ronyx_oo_jobs(oo_id);
