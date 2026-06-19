-- ============================================================
-- Migration 189: Organization Slugs & Subdomain Routing
--
-- Adds organization_slug for multi-tenant subdomain routing:
--   ronyx.movearoundtms.app    → org slug "ronyx"
--   solis.movearoundtms.app    → org slug "solis"
--   garcia.movearoundtms.app   → org slug "garcia"
--   ymrleah.movearoundtms.app  → org slug "ymrleah"
--   jjalvarado.movearoundtms.app → org slug "jjalvarado"
--   admin.movearoundtms.app    → Platform Admin Console
--
-- Also adds is_platform_admin to user_seats for admin console access.
-- ============================================================


-- ── 1. Organizations — add organization_slug ──────────────────────────────────

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS organization_slug      text,
  ADD COLUMN IF NOT EXISTS slug_verified          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_tier        text    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS onboarding_setup_fee   numeric(10,2),
  ADD COLUMN IF NOT EXISTS onboarding_monthly_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS platform_notes         text;

-- Unique index (partial — only non-null slugs to avoid unique conflict on NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_slug_unique
  ON public.organizations(organization_slug)
  WHERE organization_slug IS NOT NULL;

-- Regular lookup index
CREATE INDEX IF NOT EXISTS idx_org_slug_lookup
  ON public.organizations(organization_slug);


-- ── 2. Seed slugs for known companies ────────────────────────────────────────
-- Ronyx — primary operator (matches by UUID OR name)

UPDATE public.organizations
  SET organization_slug = 'ronyx', slug_verified = true
WHERE (id = '00000000-0000-0000-0000-000000000001'
    OR lower(name) LIKE '%ronyx%'
    OR lower(organization_code) LIKE '%ronyx%')
  AND organization_slug IS NULL;

-- Solis
UPDATE public.organizations
  SET organization_slug = 'solis', slug_verified = true
WHERE lower(name) LIKE '%solis%'
  AND organization_slug IS NULL;

-- Garcia
UPDATE public.organizations
  SET organization_slug = 'garcia', slug_verified = true
WHERE lower(name) LIKE '%garcia%'
  AND organization_slug IS NULL;

-- YMR Leah Trucking
UPDATE public.organizations
  SET organization_slug = 'ymrleah', slug_verified = true
WHERE (lower(name) LIKE '%ymr%' OR lower(name) LIKE '%leah%')
  AND organization_slug IS NULL;

-- JJ Alvarado
UPDATE public.organizations
  SET organization_slug = 'jjalvarado', slug_verified = true
WHERE (lower(name) LIKE '%alvarado%' OR lower(name) LIKE '%jj alvarado%')
  AND organization_slug IS NULL;


-- ── 3. user_seats — add is_platform_admin ────────────────────────────────────
-- Platform admins can access admin.movearoundtms.app without being restricted
-- to a single org. Every cross-org action is still audit logged.

ALTER TABLE public.user_seats
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean DEFAULT false;

-- Also add to profiles table if it exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean DEFAULT false;


-- ── 4. platform_admin_audit_log — cross-org action log ───────────────────────
-- Every time an admin takes an action on another org's data, it is logged here.

CREATE TABLE IF NOT EXISTS public.platform_admin_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   uuid NOT NULL,
  admin_email     text,
  action          text NOT NULL,
  target_org_id   uuid,
  target_org_slug text,
  target_entity   text,
  target_id       text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paal_admin_user ON public.platform_admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_paal_org        ON public.platform_admin_audit_log(target_org_id);
CREATE INDEX IF NOT EXISTS idx_paal_created    ON public.platform_admin_audit_log(created_at DESC);


-- ── 5. RLS for platform_admin_audit_log ──────────────────────────────────────

ALTER TABLE public.platform_admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admins_can_read_audit_log" ON public.platform_admin_audit_log;
CREATE POLICY "platform_admins_can_read_audit_log"
  ON public.platform_admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_seats
      WHERE user_id = auth.uid()
        AND is_platform_admin = true
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "platform_admins_can_insert_audit_log" ON public.platform_admin_audit_log;
CREATE POLICY "platform_admins_can_insert_audit_log"
  ON public.platform_admin_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_seats
      WHERE user_id = auth.uid()
        AND is_platform_admin = true
        AND status = 'active'
    )
  );


-- ── 6. RLS scaffold for organizations table ──────────────────────────────────
-- Users can read their own org. Platform admins can read all.
-- Write access to organizations is restricted to service role (admin console uses service role).

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_org" ON public.organizations;
CREATE POLICY "users_read_own_org"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.user_seats
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_seats
      WHERE user_id = auth.uid() AND is_platform_admin = true AND status = 'active'
    )
  );


-- ── Verification ──────────────────────────────────────────────────────────────

SELECT
  id,
  name,
  organization_code,
  organization_slug,
  slug_verified,
  account_type,
  subscription_status,
  bypass_subscription
FROM public.organizations
ORDER BY
  CASE WHEN lower(name) LIKE '%ronyx%' THEN 0 ELSE 1 END,
  created_at;
