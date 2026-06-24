-- Migration 001: CANONICAL BASE SCHEMA (foundational anchors).
-- Promotes core entities that previously lived ONLY in non-numbered setup files
-- (supabase/migrations/2025-11-28_master_tms_schema.sql, ROLE_BASED_SETUP.sql)
-- into the numbered migration chain, so a clean DB can be bootstrapped by
-- replaying db/migrations/ in order. Must run BEFORE 002.
--
-- DEVIATIONS FROM SOURCE (necessary — the source files are not replayable as-is):
--   1. FK-SAFE REORDER: source files declared tables before their FK targets
--      (drivers→organizations/trucks; companies→partners; loads→aggregate_tickets).
--      Reordered here so a clean DB applies top-to-bottom without error.
--   2. driver_yard_events RECONSTRUCTED: the master-schema source had a corrupted,
--      interleaved block (its columns were split across load_assignments /
--      load_documents). Rebuilt here with its intended columns.
--   3. SEEDS EXCLUDED: ROLE_BASED_SETUP's super-admin/partner email seed and the
--      "TMS setup complete" select are environment data, not schema. Keep those in
--      a separate seed script, NOT in this canonical migration.
--   4. CROSS-FKs to trucks / aggregate_tickets are DEFERRED (see Tier-4 note at
--      bottom): those tables are owned by canonical migrations 022 / 003 with a
--      DIFFERENT column shape, so this migration does not redefine them and does
--      not declare FKs to them (would force a shape decision / fail on clean DB).
--
-- Idempotent: create table if not exists / create or replace / drop-then-create.

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION A — Tenant / auth anchors (from ROLE_BASED_SETUP.sql, reordered)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  theme jsonb default '{
    "primary_color": "#10b981",
    "secondary_color": "#059669",
    "logo_url": "",
    "company_name": ""
  }'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_id uuid references public.partners(id),
  created_at timestamptz default now()
);

-- CANONICAL shape = LIVE DB (user_id-keyed, organization_id-scoped). The repo's
-- older id/company_id definition (ROLE_BASED_SETUP.sql) is STALE — confirmed
-- against live information_schema 2026-06-24. App callsites using .eq('id',…)
-- on profiles are buggy against this shape and are fixed in the #2 sweep.
create table if not exists public.profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  organization_id   uuid,                -- FK to organizations deferred (created in Section B)
  role              text not null default 'user',
  access_override   boolean not null default false,
  is_platform_admin boolean not null default false,
  created_at        timestamptz default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id),
  company_id uuid references public.companies(id),
  commission numeric default 0,
  status text default 'pending',
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION B — TMS core anchors (from master_tms_schema.sql, reordered FK-safe)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_code text unique not null,
  name text,
  created_at timestamptz default now()
);

-- NOTE: trucks is owned by canonical migration 022 (see Tier-4 note). Not created
-- here; FK from drivers.truck_id is therefore deferred (plain uuid column below).

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  first_name text,
  last_name text,
  driver_uuid uuid unique not null,
  truck_id uuid,                         -- FK to trucks deferred (owned by mig 022)
  phone text,
  photo_url text,
  status text,
  created_at timestamptz default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  name text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  name text,
  address text,
  created_at timestamptz default now()
);

create table if not exists public.yards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  name text,
  address text,
  geofence jsonb,
  created_at timestamptz default now()
);

-- RECONSTRUCTED (source block was corrupted/interleaved).
create table if not exists public.driver_yard_events (
  id uuid primary key default gen_random_uuid(),
  driver_uuid uuid references public.drivers(driver_uuid),
  truck_id uuid,                         -- FK to trucks deferred (owned by mig 022)
  yard_id uuid references public.yards(id),
  event_type text check (event_type in ('enter','exit')),
  timestamp timestamptz,
  source text check (source in ('gps','manual'))
);

-- NOTE: aggregate_tickets is owned by canonical migration 003 with a different
-- shape (unit_type/quantity/pay_rate/total_pay/... that mig-004's payroll view
-- depends on). Not created here; loads.ticket_id FK is deferred.

create table if not exists public.loads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  driver_uuid uuid references public.drivers(driver_uuid),
  truck_id uuid,                         -- FK to trucks deferred (owned by mig 022)
  yard_id uuid references public.yards(id),
  plant text,
  material text,
  status text check (status in ('open','completed','in_review')),
  load_start timestamptz,
  load_end timestamptz,
  cycle_seconds integer,
  ticket_id uuid,                        -- FK to aggregate_tickets deferred (mig 003)
  created_at timestamptz default now()
);

create table if not exists public.load_assignments (
  id uuid primary key default gen_random_uuid(),
  load_id uuid references public.loads(id),
  driver_id uuid references public.drivers(id),
  truck_id uuid,                         -- FK to trucks deferred (owned by mig 022)
  assigned_at timestamptz default now()
);

create table if not exists public.load_documents (
  id uuid primary key default gen_random_uuid(),
  load_id uuid references public.loads(id),
  document_url text,
  uploaded_at timestamptz default now()
);

create table if not exists public.aggregates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  name text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.payroll_weeks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  week_start date,
  week_end date,
  created_at timestamptz default now()
);

create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_week_id uuid references public.payroll_weeks(id),
  driver_id uuid references public.drivers(id),
  organization_id uuid references public.organizations(id),
  total_loads integer,
  total_tons numeric,
  total_pay numeric,
  settlement_json jsonb,
  created_at timestamptz default now()
);

create table if not exists public.driver_pay (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id),
  payroll_entry_id uuid references public.payroll_entries(id),
  pay_amount numeric,
  pay_type text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION C — Foundational function + trigger (auto-create profile on signup)
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(user_id, role, full_name)
  values (
    new.id,
    'user',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION D — RLS + policies
-- Tenant tables: verbatim from ROLE_BASED_SETUP (own/super_admin scoping).
-- TMS core tables: service_role policy from master schema. NOTE: authenticated
-- read/write for drivers/loads/payroll_entries is granted by the canonical RLS
-- migration (096_rls_security_hardening) later in the chain — keep that ordering.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.companies enable row level security;
alter table public.partners  enable row level security;
alter table public.profiles  enable row level security;
alter table public.referrals enable row level security;

drop policy if exists "partners see own companies" on public.companies;
create policy "partners see own companies" on public.companies
  for select using (
    partner_id in (select id from public.partners where user_id = auth.uid())
  );
-- CANONICAL admin predicate (live profiles shape): keyed on user_id, admin via
-- role text OR is_platform_admin flag. Reuse this exact form in all Tier 2/3 policies.
drop policy if exists "super admins see all companies" on public.companies;
create policy "super admins see all companies" on public.companies
  for all using (
    exists (select 1 from public.profiles p
            where p.user_id = auth.uid()
              and (lower(coalesce(p.role,'')) in ('super_admin','super admin')
                   or p.is_platform_admin = true))
  );

drop policy if exists "users see own profile" on public.profiles;
create policy "users see own profile" on public.profiles
  for all using (user_id = auth.uid());
drop policy if exists "super admins see all profiles" on public.profiles;
create policy "super admins see all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p
            where p.user_id = auth.uid()
              and (lower(coalesce(p.role,'')) in ('super_admin','super admin')
                   or p.is_platform_admin = true))
  );

alter table public.drivers         enable row level security;
alter table public.loads           enable row level security;
alter table public.payroll_entries enable row level security;

drop policy if exists "Service role can access all drivers" on public.drivers;
create policy "Service role can access all drivers" on public.drivers for all to service_role using (true);
drop policy if exists "Service role can access all loads" on public.loads;
create policy "Service role can access all loads" on public.loads for all to service_role using (true);
drop policy if exists "Service role can access all payroll_entries" on public.payroll_entries;
create policy "Service role can access all payroll_entries" on public.payroll_entries for all to service_role using (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION E — Indexes (verbatim from master schema, for 001-owned tables)
-- ═══════════════════════════════════════════════════════════════════════════
create index if not exists idx_drivers_org         on public.drivers(organization_id);
create index if not exists idx_loads_org           on public.loads(organization_id);
create index if not exists idx_payroll_entries_org on public.payroll_entries(organization_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- TIER-4 DECISION POINTS (intentionally NOT resolved here)
--   • trucks            — defined in master schema AND canonical mig 022 (+214
--                         fleet-column extension). Shapes differ. This migration
--                         defers to 022 and leaves drivers/loads/etc. truck_id as
--                         a plain uuid. DECISION NEEDED: confirm 022 is canonical,
--                         then add the FKs back in a corrective migration.
--   • aggregate_tickets — master schema shape (ocr_*/recon_*) vs canonical mig 003
--                         shape (unit_type/quantity/pay_rate/total_pay/...) that
--                         mig-004's driver_weekly_payroll_summary view requires.
--                         Owned by 003 here. DECISION NEEDED: confirm 003 is
--                         canonical and reconcile any OCR/recon columns into it.
-- ═══════════════════════════════════════════════════════════════════════════
