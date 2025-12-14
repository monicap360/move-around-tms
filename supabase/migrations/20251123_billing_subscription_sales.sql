-- MoveAround TMS: Billing + Subscription + Sales Engine
-- PHASE A: BILLING SYSTEM TABLES

-- 1. Organizations (tenants)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  paid_until date,
  base_plan_active boolean DEFAULT false,
  setup_fee_paid boolean DEFAULT false,
  truck_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Billing Payments
CREATE TABLE billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid,
  amount numeric(10,2) NOT NULL,
  payment_type text NOT NULL, -- e.g. 'zelle', 'card'
  screenshot_url text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  seat_count integer,
  setup_fee_tier text,
  agent_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Billing Addons
CREATE TABLE billing_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  addon text NOT NULL, -- e.g. 'payroll', 'ocr', etc.
  active boolean DEFAULT false,
  paid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Agent Commissions
CREATE TABLE agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  event text,
  created_at timestamptz DEFAULT now()
);

-- 5. Subscription History
CREATE TABLE subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  plan text,
  amount numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- 6. User Seats
CREATE TABLE user_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid,
  seat_type text, -- 'office', 'driver'
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. Agents
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  referral_code text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 8. Agent Leads
CREATE TABLE agent_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  status text,
  created_at timestamptz DEFAULT now()
);

-- 9. Lead Contacts
CREATE TABLE lead_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES agent_leads(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- 10. Commission Events
CREATE TABLE commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event text,
  amount numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and add policies for multi-tenant security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_events ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for organizations (org users can see their org)
CREATE POLICY org_users_select ON organizations
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.org_id = organizations.id AND user_seats.user_id = auth.uid()
  ));

-- Example RLS policy for billing_payments (org users only)
CREATE POLICY org_users_select ON billing_payments
  USING (EXISTS (
    SELECT 1 FROM user_seats WHERE user_seats.org_id = billing_payments.org_id AND user_seats.user_id = auth.uid()
  ));

-- Repeat similar RLS policies for other tables as needed.
