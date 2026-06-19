-- ============================================================
-- Migration 176: MoveAround Driver Network™
--
-- Adds identity-locking and anonymous marketplace fields to driver_profiles.
-- Creates driver_network_profiles (public anonymous view data),
-- driver_network_unlocks (company unlock requests and payments),
-- and driver_network_shortlists (company shortlists).
--
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Extend driver_profiles with network / anonymization fields
-- ------------------------------------------------------------

ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS anonymous_driver_id     text        UNIQUE,
  ADD COLUMN IF NOT EXISTS profile_visibility      text        DEFAULT 'private'
    CHECK (profile_visibility IN ('private','network','public')),
  ADD COLUMN IF NOT EXISTS identity_locked         boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_locked          boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS resume_locked           boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS documents_locked        boolean     DEFAULT true,
  ADD COLUMN IF NOT EXISTS driver_consent_status   text        DEFAULT 'pending'
    CHECK (driver_consent_status IN ('pending','granted','denied','revoked')),
  ADD COLUMN IF NOT EXISTS driver_consent_at       timestamptz,
  ADD COLUMN IF NOT EXISTS hire_ready_score        integer     DEFAULT 0 CHECK (hire_ready_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS network_status          text        DEFAULT 'not_listed'
    CHECK (network_status IN ('not_listed','anonymous_profile','shortlisted','intro_requested','unlock_pending','unlocked','interview_requested','hired','not_selected')),
  ADD COLUMN IF NOT EXISTS city_area               text,
  ADD COLUMN IF NOT EXISTS preferred_work_area     text,
  ADD COLUMN IF NOT EXISTS years_experience        integer,
  ADD COLUMN IF NOT EXISTS driver_type             text,
  ADD COLUMN IF NOT EXISTS equipment_experience    text[],
  ADD COLUMN IF NOT EXISTS material_experience     text[],
  ADD COLUMN IF NOT EXISTS availability_status     text        DEFAULT 'not_available'
    CHECK (availability_status IN ('available_now','available_7_days','available_30_days','not_available')),
  ADD COLUMN IF NOT EXISTS compliance_summary      text,
  ADD COLUMN IF NOT EXISTS redacted_experience_summary text,
  ADD COLUMN IF NOT EXISTS network_listed_at       timestamptz;

-- Auto-generate MADN ID for drivers entering the network
CREATE OR REPLACE FUNCTION public.generate_madn_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.anonymous_driver_id IS NULL AND NEW.profile_visibility IN ('network','public') THEN
    NEW.anonymous_driver_id := 'MADN-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_madn_id ON public.driver_profiles;
CREATE TRIGGER trg_generate_madn_id
  BEFORE INSERT OR UPDATE ON public.driver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_madn_id();


-- ------------------------------------------------------------
-- 2. driver_network_unlocks
--    Records company unlock requests, payment status, and release events.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_network_unlocks (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_profile_id       uuid        REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  anonymous_driver_id     text,
  requested_by_name       text,
  request_type            text        DEFAULT 'unlock'
    CHECK (request_type IN ('unlock','introduction','invitation')),
  status                  text        DEFAULT 'pending'
    CHECK (status IN ('pending','payment_required','approved','denied','revoked','expired')),
  unlock_fee_cents        integer     DEFAULT 9900,
  stripe_payment_intent   text,
  payment_status          text        DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded')),
  paid_at                 timestamptz,
  approved_at             timestamptz,
  approved_by             text,
  driver_consent_required boolean     DEFAULT true,
  driver_consented_at     timestamptz,
  identity_released       boolean     DEFAULT false,
  contact_released        boolean     DEFAULT false,
  resume_released         boolean     DEFAULT false,
  notes                   text,
  expires_at              timestamptz DEFAULT now() + interval '90 days',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE (organization_id, driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_dnu_org      ON public.driver_network_unlocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_dnu_driver   ON public.driver_network_unlocks(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_dnu_status   ON public.driver_network_unlocks(status);

ALTER TABLE public.driver_network_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dnu_select" ON public.driver_network_unlocks;
DROP POLICY IF EXISTS "dnu_insert" ON public.driver_network_unlocks;
DROP POLICY IF EXISTS "dnu_update" ON public.driver_network_unlocks;

CREATE POLICY "dnu_select" ON public.driver_network_unlocks
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "dnu_insert" ON public.driver_network_unlocks
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "dnu_update" ON public.driver_network_unlocks
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 3. driver_network_shortlists
--    Companies save anonymous drivers to a shortlist before unlocking.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_network_shortlists (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_profile_id   uuid        REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  anonymous_driver_id text,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  UNIQUE (organization_id, driver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_dns_org    ON public.driver_network_shortlists(organization_id);
CREATE INDEX IF NOT EXISTS idx_dns_driver ON public.driver_network_shortlists(driver_profile_id);

ALTER TABLE public.driver_network_shortlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dns_select" ON public.driver_network_shortlists;
DROP POLICY IF EXISTS "dns_insert" ON public.driver_network_shortlists;
DROP POLICY IF EXISTS "dns_delete" ON public.driver_network_shortlists;

CREATE POLICY "dns_select" ON public.driver_network_shortlists
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "dns_insert" ON public.driver_network_shortlists
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "dns_delete" ON public.driver_network_shortlists
  FOR DELETE TO authenticated USING (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 4. Add Driver Finder™ to module_registry
-- ------------------------------------------------------------

INSERT INTO public.module_registry (
  module_key, module_name, module_subtitle, category, description, features,
  default_status, price_monthly, price_label, included_in_plan,
  sort_order, is_trial_included, is_enterprise_add_on
)
VALUES (
  'driver_finder',
  'Driver Finder™',
  'MoveAround Driver Network™',
  'Hiring',
  'Search anonymous hire-ready driver profiles. Driver identity, contact info, and documents stay hidden until an approved unlock. 5 driver unlocks per month included.',
  ARRAY[
    'Browse anonymous hire-ready driver profiles',
    'Hire-Ready Score per driver',
    'Compliance summary (CDL, medical, MVR status)',
    'Equipment and material experience filter',
    'Shortlist drivers before committing',
    'Request introduction through MoveAround',
    '5 driver unlocks per month included',
    'Extra unlocks available at $49 each',
    'Driver consent and identity protection',
    'Hiring pipeline integration'
  ],
  'available',
  299,
  '$299/mo · 5 driver unlocks included · Extra unlocks $49 each',
  ARRAY['operations_pro','enterprise','enterprise_plus'],
  370,
  false,
  false
)
ON CONFLICT (module_key) DO UPDATE SET
  module_name          = excluded.module_name,
  module_subtitle      = excluded.module_subtitle,
  category             = excluded.category,
  description          = excluded.description,
  features             = excluded.features,
  price_monthly        = excluded.price_monthly,
  price_label          = excluded.price_label,
  included_in_plan     = excluded.included_in_plan,
  sort_order           = excluded.sort_order,
  updated_at           = now();


-- ------------------------------------------------------------
-- 5. Validate
-- ------------------------------------------------------------

SELECT
  column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'driver_profiles'
  AND column_name  IN ('anonymous_driver_id','identity_locked','contact_locked','hire_ready_score','network_status','driver_consent_status')
ORDER BY column_name;

SELECT table_name, 'exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('driver_network_unlocks','driver_network_shortlists')
ORDER BY table_name;

SELECT module_key, module_name, price_monthly, price_label
FROM public.module_registry
WHERE module_key IN ('driver_finder','be_audit_ready')
ORDER BY module_key;
