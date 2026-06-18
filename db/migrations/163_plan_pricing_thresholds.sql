-- Migration 163: Official plan pricing thresholds and limits
-- Updates subscription_plans with real pricing, setup fees, capacity limits, and overage rates.

-- Extend subscription_plans with capacity + overage columns
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS setup_price          numeric(10,2),
  ADD COLUMN IF NOT EXISTS max_trucks           integer,
  ADD COLUMN IF NOT EXISTS max_drivers          integer,
  ADD COLUMN IF NOT EXISTS max_monthly_scans    integer,
  ADD COLUMN IF NOT EXISTS max_staff_users      integer,
  ADD COLUMN IF NOT EXISTS overage_per_scan     numeric(6,4),
  ADD COLUMN IF NOT EXISTS overage_per_driver   numeric(6,2),
  ADD COLUMN IF NOT EXISTS overage_per_truck    numeric(6,2),
  ADD COLUMN IF NOT EXISTS overage_per_user     numeric(6,2),
  ADD COLUMN IF NOT EXISTS truck_range_label    text,
  ADD COLUMN IF NOT EXISTS driver_range_label   text,
  ADD COLUMN IF NOT EXISTS is_enterprise        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tagline              text;

-- ─── STARTER ─────────────────────────────────────────────────────────────────
UPDATE public.subscription_plans SET
  monthly_price      = 399,
  setup_price        = 999,
  max_trucks         = 5,
  max_drivers        = 10,
  max_monthly_scans  = 250,
  max_staff_users    = 3,
  truck_range_label  = '1–5 trucks',
  driver_range_label = '1–10 drivers',
  overage_per_scan   = 0.35,
  overage_per_driver = 7.50,
  overage_per_truck  = 15.00,
  overage_per_user   = 29.00,
  is_enterprise      = false,
  tagline            = 'For small carriers and owner-operator offices',
  features           = '["Company dashboard","Driver records","Truck records","Basic documents","Basic compliance reminders","Basic reports","Store/Merch (optional)","Up to 5 trucks","Up to 10 drivers","250 ticket scans/month","1 company workspace","3 staff users"]'::jsonb
WHERE slug = 'starter';

-- ─── OPERATIONS ───────────────────────────────────────────────────────────────
UPDATE public.subscription_plans SET
  monthly_price      = 899,
  setup_price        = 2500,
  max_trucks         = 20,
  max_drivers        = 35,
  max_monthly_scans  = 1000,
  max_staff_users    = 5,
  truck_range_label  = '6–20 trucks',
  driver_range_label = '11–35 drivers',
  overage_per_scan   = 0.35,
  overage_per_driver = 7.50,
  overage_per_truck  = 15.00,
  overage_per_user   = 29.00,
  is_enterprise      = false,
  tagline            = 'For growing trucking companies with active dispatch',
  features           = '["Everything in Starter","Dispatch Board","Compliance Center","Maintenance","Owner Operator profiles","Reminder Center","Office Notes","Basic ticket upload","Up to 20 trucks","Up to 35 drivers","1,000 scans/month","5 staff users"]'::jsonb
WHERE slug = 'operations';

-- ─── PRO (main package) ───────────────────────────────────────────────────────
UPDATE public.subscription_plans SET
  monthly_price      = 1799,
  setup_price        = 5000,
  max_trucks         = 75,
  max_drivers        = 125,
  max_monthly_scans  = 5000,
  max_staff_users    = 15,
  truck_range_label  = '21–75 trucks',
  driver_range_label = '36–125 drivers',
  overage_per_scan   = 0.35,
  overage_per_driver = 7.50,
  overage_per_truck  = 15.00,
  overage_per_user   = 29.00,
  is_enterprise      = false,
  tagline            = 'Ticket, payroll, and billing automation — the MoveAround core package',
  features           = '["Everything in Operations","Fast Scan OCR","Ticket Reconciliation","Pit Invoice Upload","Excel Match","Payroll Review","Billing Ready","Settlement Review","Audit Trail","AI Office Assistant","Store/Merch module","Up to 75 trucks","Up to 125 drivers","5,000 scans/month","15 staff users"]'::jsonb
WHERE slug = 'pro';

-- ─── ENTERPRISE ──────────────────────────────────────────────────────────────
UPDATE public.subscription_plans SET
  monthly_price      = 3500,
  setup_price        = 8000,
  max_trucks         = 200,
  max_drivers        = 300,
  max_monthly_scans  = 15000,
  max_staff_users    = 9999,
  truck_range_label  = '76–200 trucks',
  driver_range_label = '126–300 drivers',
  overage_per_scan   = 0.35,
  overage_per_driver = 5.00,
  overage_per_truck  = 10.00,
  overage_per_user   = 29.00,
  is_enterprise      = true,
  tagline            = 'For large fleets, high-volume operations, and multi-dispatch teams',
  features           = '["Everything in Pro","Advanced permissions","Multi-branch setup","Custom workflows","Advanced reporting","Priority support","Dedicated onboarding","Custom ticket templates","Advanced AI Office Assistant","Customer portal","Live tracking","Up to 200 trucks","Up to 300 drivers","15,000 scans/month","Unlimited staff users"]'::jsonb
WHERE slug = 'enterprise';

-- ─── ENTERPRISE PLUS (new) ───────────────────────────────────────────────────
INSERT INTO public.subscription_plans (
  slug, name, description, monthly_price, setup_price,
  max_trucks, max_drivers, max_monthly_scans, max_staff_users,
  truck_range_label, driver_range_label,
  overage_per_scan, overage_per_driver, overage_per_truck, overage_per_user,
  is_enterprise, tagline, sort_order, is_active, features
) VALUES (
  'enterprise-plus',
  'Enterprise Plus',
  'Multi-location and very high-volume operations',
  5000,
  15000,
  NULL, NULL, NULL, NULL,
  '200+ trucks',
  '300+ drivers',
  0.25, 5.00, 10.00, 29.00,
  true,
  'Multi-location carriers and high-volume ticket, payroll, and billing operations',
  4,
  true,
  '["Everything in Enterprise","Multiple company workspaces","White-label options","Dedicated account manager","Custom integrations","SLA guarantee","Custom data import","15,000+ scans/month","Custom setup and training"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  monthly_price     = EXCLUDED.monthly_price,
  setup_price       = EXCLUDED.setup_price,
  features          = EXCLUDED.features,
  tagline           = EXCLUDED.tagline,
  is_enterprise     = EXCLUDED.is_enterprise;
