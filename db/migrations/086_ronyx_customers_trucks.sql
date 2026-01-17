-- Migration: Basic customer + truck records
CREATE TABLE IF NOT EXISTS public.ronyx_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  customer_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  billing_address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_customers_name
  ON public.ronyx_customers(customer_name);

CREATE TABLE IF NOT EXISTS public.ronyx_trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  truck_number text NOT NULL,
  vin text,
  make text,
  model text,
  year integer,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_number
  ON public.ronyx_trucks(truck_number);
