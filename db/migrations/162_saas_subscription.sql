-- ============================================================
-- 162_saas_subscription.sql
-- SaaS subscription plans, modules, and org subscription tables
-- ============================================================

-- Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  annual_price  numeric(10,2),
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  features      jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Modules
CREATE TABLE IF NOT EXISTS public.modules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  name                text NOT NULL,
  description         text,
  monthly_price       numeric(10,2) NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  icon                text,
  category            text NOT NULL DEFAULT 'operations',
  included_in_plans   text[] NOT NULL DEFAULT '{}',
  sort_order          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Organization subscriptions
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL UNIQUE,
  plan_id                 uuid REFERENCES public.subscription_plans(id),
  plan_slug               text NOT NULL DEFAULT 'starter',
  status                  text NOT NULL DEFAULT 'trialing',
  trial_ends_at           timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancelled_at            timestamptz,
  billing_email           text,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Organization active modules
CREATE TABLE IF NOT EXISTS public.organization_modules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  module_id       uuid REFERENCES public.modules(id),
  module_slug     text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  activated_at    timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz,
  UNIQUE(organization_id, module_slug)
);

-- Billing events (audit trail)
CREATE TABLE IF NOT EXISTS public.organization_billing_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_type      text NOT NULL,
  plan_slug       text,
  module_slug     text,
  amount          numeric(10,2),
  stripe_event_id text,
  notes           text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Usage events
CREATE TABLE IF NOT EXISTS public.organization_usage_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  module_slug     text NOT NULL,
  event_type      text NOT NULL,
  quantity        int NOT NULL DEFAULT 1,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org_id
  ON public.organization_subscriptions (organization_id);

CREATE INDEX IF NOT EXISTS idx_org_modules_org_id
  ON public.organization_modules (organization_id);

CREATE INDEX IF NOT EXISTS idx_org_modules_org_slug
  ON public.organization_modules (organization_id, module_slug);

CREATE INDEX IF NOT EXISTS idx_billing_events_org_id
  ON public.organization_billing_events (organization_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_id
  ON public.organization_usage_events (organization_id);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_module
  ON public.organization_usage_events (organization_id, module_slug);

-- ── updated_at trigger for organization_subscriptions ────────────────────────

CREATE OR REPLACE FUNCTION public.set_org_subscription_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_subscriptions_updated_at ON public.organization_subscriptions;
CREATE TRIGGER trg_org_subscriptions_updated_at
  BEFORE UPDATE ON public.organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_org_subscription_updated_at();

-- ── Seed Plans ────────────────────────────────────────────────────────────────

INSERT INTO public.subscription_plans (slug, name, monthly_price, sort_order, features)
VALUES
  ('starter',    'Starter',    99,  0, '["Up to 10 trucks","Core dispatch","Driver management","Basic reporting"]'),
  ('operations', 'Operations', 199, 1, '["Up to 50 trucks","All Starter features","Fast Scan OCR","Compliance monitor","Owner Operator management"]'),
  ('pro',        'Pro',        299, 2, '["Unlimited trucks","All Operations features","AI Office Assistant","Live Tracking","Customer Portal","Priority support"]'),
  ('enterprise', 'Enterprise', 0,   3, '["Custom pricing","All Pro features","Dedicated support","Custom integrations","White-label options"]')
ON CONFLICT (slug) DO NOTHING;

-- ── Seed Modules ──────────────────────────────────────────────────────────────

INSERT INTO public.modules (slug, name, monthly_price, category, icon, included_in_plans, sort_order)
VALUES
  ('dispatch',        'Dispatch',            0,   'operations', '🚛', ARRAY['starter','operations','pro','enterprise'],  0),
  ('fast-scan',       'Fast Scan',           49,  'operations', '📷', ARRAY['operations','pro','enterprise'],             1),
  ('compliance',      'Compliance',          29,  'compliance', '🛡️', ARRAY['operations','pro','enterprise'],             2),
  ('maintenance',     'Maintenance',         29,  'operations', '🔧', ARRAY['pro','enterprise'],                          3),
  ('payroll',         'Payroll',             49,  'money',      '💰', ARRAY['operations','pro','enterprise'],             4),
  ('billing',         'Billing',             49,  'money',      '💵', ARRAY['pro','enterprise'],                          5),
  ('owner-operators', 'Owner Operators',     39,  'people',     '🤝', ARRAY['operations','pro','enterprise'],             6),
  ('customer-portal', 'Customer Portal',     59,  'operations', '🌐', ARRAY['pro','enterprise'],                          7),
  ('live-tracking',   'Live Tracking',       79,  'operations', '📍', ARRAY['pro','enterprise'],                          8),
  ('ai-assistant',    'AI Office Assistant', 99,  'ai',         '🤖', ARRAY['pro','enterprise'],                          9),
  ('store',           'Store / Merch',       19,  'commerce',   '🛒', ARRAY['starter','operations','pro','enterprise'],  10)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed Pro subscription for first org ──────────────────────────────────────

WITH org AS (SELECT id FROM public.organizations LIMIT 1),
     pro_plan AS (SELECT id FROM public.subscription_plans WHERE slug = 'pro')
INSERT INTO public.organization_subscriptions (
  organization_id, plan_id, plan_slug, status,
  trial_ends_at, current_period_start, current_period_end
)
SELECT
  org.id,
  pro_plan.id,
  'pro',
  'active',
  NULL,
  now(),
  now() + interval '30 days'
FROM org, pro_plan
ON CONFLICT (organization_id) DO NOTHING;

-- Activate all modules for first org
INSERT INTO public.organization_modules (organization_id, module_id, module_slug, is_active)
SELECT
  (SELECT id FROM public.organizations LIMIT 1),
  m.id,
  m.slug,
  true
FROM public.modules m
ON CONFLICT (organization_id, module_slug) DO NOTHING;
