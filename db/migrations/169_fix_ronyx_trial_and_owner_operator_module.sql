-- ============================================================
-- Migration 169: Fix Ronyx Trial Bypass + Owner Operator Module
-- File: db/migrations/169_fix_ronyx_trial_and_owner_operator_module.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ensure required organization trial columns exist
-- ------------------------------------------------------------

alter table public.organizations
add column if not exists account_type text default 'standard';

alter table public.organizations
add column if not exists subscription_status text default 'none';

alter table public.organizations
add column if not exists bypass_subscription boolean default false;

alter table public.organizations
add column if not exists subscription_required boolean default true;

alter table public.organizations
add column if not exists pilot_started_at timestamptz;

alter table public.organizations
add column if not exists pilot_ends_at timestamptz;

alter table public.organizations
add column if not exists pilot_notes text;


-- ------------------------------------------------------------
-- 2. Ensure module tables exist
-- ------------------------------------------------------------

create table if not exists public.module_registry (
  module_key text primary key,
  module_name text not null,
  module_subtitle text,
  category text not null,
  description text,
  features text[] default '{}',
  default_status text not null default 'available',
  price_monthly numeric default 0,
  price_label text,
  included_in_plan text[] default '{}',
  sort_order integer default 100,
  is_trial_included boolean default false,
  is_enterprise_add_on boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_modules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  module_name text not null,
  module_subtitle text,
  category text not null,
  status text not null default 'available',
  description text,
  features text[] default '{}',
  price_monthly numeric default 0,
  price_label text,
  included_in_plan text[] default '{}',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, module_key)
);


-- ------------------------------------------------------------
-- 3. Make sure Owner Operator Hub exists in module_registry
-- ------------------------------------------------------------

insert into public.module_registry (
  module_key,
  module_name,
  module_subtitle,
  category,
  description,
  features,
  default_status,
  price_monthly,
  price_label,
  included_in_plan,
  sort_order,
  is_trial_included,
  is_enterprise_add_on
)
values (
  'owner_operator_hub',
  'Owner Operator Hub',
  'Operations',
  'Operations',
  'Manage owner operators, sub-haulers, contracts, insurance, drivers, trucks, documents, compliance, dispatch eligibility, and settlements.',
  array[
    'Owner operator profiles',
    'Sub-hauler management',
    'Contract tracking',
    'Auto Liability COI tracking',
    'General Liability COI tracking',
    'Cargo COI tracking',
    'Driver and truck assignment',
    'Settlement readiness',
    'Dispatch eligibility',
    'Compliance holds'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  50,
  true,
  false
)
on conflict (module_key)
do update set
  module_name = excluded.module_name,
  module_subtitle = excluded.module_subtitle,
  category = excluded.category,
  description = excluded.description,
  features = excluded.features,
  default_status = excluded.default_status,
  price_monthly = excluded.price_monthly,
  price_label = excluded.price_label,
  included_in_plan = excluded.included_in_plan,
  sort_order = excluded.sort_order,
  is_trial_included = true,
  is_enterprise_add_on = false,
  updated_at = now();


-- ------------------------------------------------------------
-- 4. Force Ronyx into a fresh valid 30-day free trial
-- ------------------------------------------------------------

update public.organizations
set
  status = 'active',
  account_type = 'free_trial',
  subscription_status = 'trial_active',
  bypass_subscription = true,
  subscription_required = false,
  pilot_started_at = now(),
  pilot_ends_at = now() + interval '30 days',
  pilot_notes = 'Ronyx 30-day free trial reset by migration 169. Subscription pages bypassed during trial period.'
where lower(name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%';


-- ------------------------------------------------------------
-- 5. Add Owner Operator Hub to Ronyx as IN TRIAL
-- ------------------------------------------------------------

insert into public.organization_modules (
  organization_id,
  module_key,
  module_name,
  module_subtitle,
  category,
  status,
  description,
  features,
  price_monthly,
  price_label,
  included_in_plan,
  trial_started_at,
  trial_ends_at,
  activated_at
)
select
  o.id,
  mr.module_key,
  mr.module_name,
  mr.module_subtitle,
  mr.category,
  'in_trial',
  mr.description,
  mr.features,
  mr.price_monthly,
  mr.price_label,
  mr.included_in_plan,
  o.pilot_started_at,
  o.pilot_ends_at,
  now()
from public.organizations o
join public.module_registry mr
  on mr.module_key = 'owner_operator_hub'
where lower(o.name) like '%ronyx%'
   or lower(o.organization_code) like '%ronyx%'
on conflict (organization_id, module_key)
do update set
  module_name = excluded.module_name,
  module_subtitle = excluded.module_subtitle,
  category = excluded.category,
  status = 'in_trial',
  description = excluded.description,
  features = excluded.features,
  price_monthly = excluded.price_monthly,
  price_label = excluded.price_label,
  included_in_plan = excluded.included_in_plan,
  trial_started_at = excluded.trial_started_at,
  trial_ends_at = excluded.trial_ends_at,
  activated_at = coalesce(public.organization_modules.activated_at, now()),
  deactivated_at = null,
  updated_at = now();


-- ------------------------------------------------------------
-- 6. Make sure every trial-included module is added for Ronyx
-- ------------------------------------------------------------

insert into public.organization_modules (
  organization_id,
  module_key,
  module_name,
  module_subtitle,
  category,
  status,
  description,
  features,
  price_monthly,
  price_label,
  included_in_plan,
  trial_started_at,
  trial_ends_at,
  activated_at
)
select
  o.id,
  mr.module_key,
  mr.module_name,
  mr.module_subtitle,
  mr.category,
  'in_trial',
  mr.description,
  mr.features,
  mr.price_monthly,
  mr.price_label,
  mr.included_in_plan,
  o.pilot_started_at,
  o.pilot_ends_at,
  now()
from public.organizations o
cross join public.module_registry mr
where (lower(o.name) like '%ronyx%' or lower(o.organization_code) like '%ronyx%')
  and mr.is_trial_included = true
on conflict (organization_id, module_key)
do update set
  module_name = excluded.module_name,
  module_subtitle = excluded.module_subtitle,
  category = excluded.category,
  status = 'in_trial',
  description = excluded.description,
  features = excluded.features,
  price_monthly = excluded.price_monthly,
  price_label = excluded.price_label,
  included_in_plan = excluded.included_in_plan,
  trial_started_at = excluded.trial_started_at,
  trial_ends_at = excluded.trial_ends_at,
  activated_at = coalesce(public.organization_modules.activated_at, now()),
  deactivated_at = null,
  updated_at = now();


-- ------------------------------------------------------------
-- 7. Recreate marketplace view
-- ------------------------------------------------------------

create or replace view public.organization_module_marketplace as
select
  om.id,
  om.organization_id,
  o.name as organization_name,
  o.organization_code,
  o.status as organization_status,
  o.account_type,
  o.subscription_status,
  o.bypass_subscription,
  o.subscription_required,
  o.pilot_started_at,
  o.pilot_ends_at,

  case
    when o.pilot_ends_at is not null
    then greatest(0, ceil(extract(epoch from (o.pilot_ends_at - now())) / 86400)::int)
    else null
  end as trial_days_left,

  om.module_key,
  om.module_name,
  om.module_subtitle,
  om.category,
  om.status,
  om.description,
  om.features,
  om.price_monthly,
  om.price_label,
  om.included_in_plan,
  om.trial_started_at,
  om.trial_ends_at,
  om.activated_at,
  om.deactivated_at,
  om.created_at,
  om.updated_at,

  case
    when om.status in ('active', 'in_trial') then true
    else false
  end as counts_as_active

from public.organization_modules om
join public.organizations o
  on o.id = om.organization_id;


-- ------------------------------------------------------------
-- 8. Validation: Ronyx access check
-- ------------------------------------------------------------

select
  id,
  name,
  organization_code,
  status,
  account_type,
  subscription_status,
  bypass_subscription,
  subscription_required,
  pilot_started_at,
  pilot_ends_at,
  now() as current_time,
  pilot_ends_at - now() as time_left,
  case
    when status = 'active'
     and account_type = 'free_trial'
     and subscription_status = 'trial_active'
     and bypass_subscription = true
     and subscription_required = false
     and pilot_started_at is not null
     and pilot_ends_at > now()
    then 'ACCESS_ALLOWED'
    else 'ACCESS_BLOCKED'
  end as access_check
from public.organizations
where lower(name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%';


-- ------------------------------------------------------------
-- 9. Validation: Owner Operator Hub exists for Ronyx
-- ------------------------------------------------------------

select
  organization_name,
  organization_code,
  module_key,
  module_name,
  module_subtitle,
  category,
  status,
  price_monthly,
  price_label,
  trial_started_at,
  trial_ends_at,
  trial_days_left
from public.organization_module_marketplace
where (lower(organization_name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%')
  and module_key = 'owner_operator_hub';


-- ------------------------------------------------------------
-- 10. Validation: Ronyx module counts
-- ------------------------------------------------------------

select
  organization_name,
  count(*) filter (where status in ('active', 'in_trial')) as active_modules,
  count(*) filter (where status = 'in_trial') as trial_modules,
  count(*) filter (where status = 'available') as available_addons,
  max(trial_days_left) as trial_days_left,
  sum(case when status = 'available' then coalesce(price_monthly, 0) else 0 end) as estimated_available_addon_cost
from public.organization_module_marketplace
where lower(organization_name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%'
group by organization_name;
