-- Migration 224: Global localization FOUNDATION (architecture only — US stays the
-- only active market). Adds org locale settings + 3 registries (localized content,
-- pricing, compliance rules). NO country compliance workflows / local pricing are
-- activated here. Idempotent. RLS uses the existing org-membership + internal-admin
-- pattern (see SECURITY.md / [[project_rls_security_posture]]) — no new RLS model.

-- ── 1. organizations: localization settings ─────────────────────────────────
alter table if exists public.organizations add column if not exists primary_locale            text    not null default 'en-US';
alter table if exists public.organizations add column if not exists secondary_locales          jsonb   not null default '[]'::jsonb;
alter table if exists public.organizations add column if not exists operating_countries        jsonb   not null default '["US"]'::jsonb;
alter table if exists public.organizations add column if not exists preferred_currency         text    not null default 'USD';
alter table if exists public.organizations add column if not exists timezone                   text    not null default 'America/Chicago';
alter table if exists public.organizations add column if not exists date_format_preference     text    not null default 'MM/DD/YYYY';
alter table if exists public.organizations add column if not exists number_format_preference   text    not null default 'en-US';
alter table if exists public.organizations add column if not exists terminology_overrides      jsonb   not null default '{}'::jsonb;

-- user-level display language (org settings drive calculations/compliance; this
-- only affects the individual's UI language — per the spec's locale split).
alter table if exists public.profiles add column if not exists display_locale text;

-- ── 2. command_ai_localized_content ─────────────────────────────────────────
create table if not exists public.command_ai_localized_content (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid references public.organizations(id) on delete cascade, -- null = global default
  locale                  text not null,
  content_type            text not null,   -- brief|alert|recommendation|approval_message|upgrade_page|blueprint_managed|email|notification|help_content
  content_key             text not null,
  template_content        text not null,
  custom_terminology_json jsonb not null default '{}'::jsonb,
  is_active               boolean not null default true,
  reviewed_by             uuid,
  reviewed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists cailc_lookup_idx on public.command_ai_localized_content (locale, content_type, content_key);
create index if not exists cailc_org_idx    on public.command_ai_localized_content (organization_id);
create unique index if not exists cailc_unique_idx
  on public.command_ai_localized_content (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), locale, content_type, content_key);

-- ── 3. pricing_localizations (US stays the only active price) ───────────────
create table if not exists public.pricing_localizations (
  id                   uuid primary key default gen_random_uuid(),
  product_tier         text not null,
  plan_code            text not null,
  country_code         text not null,
  currency_code        text not null,
  monthly_price_local  numeric(12,2),
  launch_fee_local     numeric(12,2),
  min_trucks           integer,
  max_trucks           integer,
  market_tier          integer,
  active_status        boolean not null default false,   -- never auto-active; manual approval per country
  notes                text,                              -- internal only (hidden from customers in app layer)
  effective_start_date date,
  effective_end_date   date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists pricing_loc_lookup_idx on public.pricing_localizations (product_tier, plan_code, country_code, active_status);

-- ── 4. compliance_intelligence_rules (foundation only — not authoritative) ──
create table if not exists public.compliance_intelligence_rules (
  id                     uuid primary key default gen_random_uuid(),
  country_code           text not null,
  jurisdiction_code      text,
  rule_type              text not null,
  rule_name              text not null,
  rule_description       text,
  affected_entity_type   text,
  required_document_type text,
  effective_date         date,
  expiration_logic       jsonb not null default '{}'::jsonb,
  dispatch_block_logic   jsonb not null default '{}'::jsonb,
  warning_threshold_days  integer,
  critical_threshold_days integer,
  regulatory_reference   text,
  status                 text not null default 'draft' check (status in ('draft','under_review','approved','active','retired')),
  reviewed_by            uuid,
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists cir_country_status_idx on public.compliance_intelligence_rules (country_code, status);

-- ── 5. RLS (existing org-membership + internal-admin pattern; no new model) ──
alter table if exists public.command_ai_localized_content    enable row level security;
alter table if exists public.pricing_localizations           enable row level security;
alter table if exists public.compliance_intelligence_rules   enable row level security;

-- localized content: org users read their org's content + global templates;
-- org admins manage their org overrides; internal admins manage global templates.
drop policy if exists "cailc_read" on public.command_ai_localized_content;
create policy "cailc_read" on public.command_ai_localized_content
  for select using (
    organization_id is null
    or organization_id in (select organization_id from public.organization_members where user_id = auth.uid())
  );
drop policy if exists "cailc_org_admin_write" on public.command_ai_localized_content;
create policy "cailc_org_admin_write" on public.command_ai_localized_content
  for all using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and lower(coalesce(role,'')) in ('owner','admin','super_admin'))
  ) with check (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and lower(coalesce(role,'')) in ('owner','admin','super_admin'))
  );
drop policy if exists "cailc_internal_global" on public.command_ai_localized_content;
create policy "cailc_internal_global" on public.command_ai_localized_content
  for all using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin')))
  ) with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin')))
  );

-- pricing: authenticated may read ACTIVE rows (customer pricing display);
-- only internal MoveAround admins manage. (Internal `notes` hidden in app layer.)
drop policy if exists "pricing_read_active" on public.pricing_localizations;
create policy "pricing_read_active" on public.pricing_localizations
  for select using (active_status = true or
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin'))));
drop policy if exists "pricing_internal_write" on public.pricing_localizations;
create policy "pricing_internal_write" on public.pricing_localizations
  for all using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin')))
  ) with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin')))
  );

-- compliance rules: authenticated may read ACTIVE rules only; only internal
-- compliance admins (platform admins) create/approve/activate.
drop policy if exists "cir_read_active" on public.compliance_intelligence_rules;
create policy "cir_read_active" on public.compliance_intelligence_rules
  for select using (status = 'active' or
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin'))));
drop policy if exists "cir_internal_write" on public.compliance_intelligence_rules;
create policy "cir_internal_write" on public.compliance_intelligence_rules
  for all using (
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin')))
  ) with check (
    exists (select 1 from public.profiles p where p.user_id = auth.uid()
            and (p.is_platform_admin = true or lower(coalesce(p.role,'')) in ('super_admin','super admin')))
  );
