-- ============================================================
-- Migration 167b: Patch organization_modules if it pre-existed
-- from migration 162 (which used module_slug/is_active/module_id)
-- ============================================================

-- Add new columns if they are missing
alter table public.organization_modules
  add column if not exists module_key      text,
  add column if not exists module_name     text,
  add column if not exists module_subtitle text,
  add column if not exists category        text,
  add column if not exists status          text not null default 'available',
  add column if not exists description     text,
  add column if not exists features        text[] default '{}',
  add column if not exists price_monthly   numeric default 0,
  add column if not exists price_label     text,
  add column if not exists included_in_plan text[] default '{}',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at   timestamptz,
  add column if not exists updated_at      timestamptz default now();

-- Backfill module_key from module_slug for rows that existed before 167
update public.organization_modules
set module_key = module_slug
where module_key is null and module_slug is not null;

-- Backfill category from the modules table if it exists
update public.organization_modules om
set
  module_name = m.name,
  category    = m.category,
  price_monthly = m.monthly_price
from public.modules m
where om.module_slug = m.slug
  and (om.module_name is null or om.category is null);

-- Backfill status from is_active boolean (old schema)
update public.organization_modules
set status = case when is_active = true then 'active' else 'inactive' end
where status = 'available' and is_active is not null;

-- Add unique constraint on (organization_id, module_key) if not already present
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_modules_org_module_key_unique'
  ) then
    alter table public.organization_modules
      add constraint organization_modules_org_module_key_unique
      unique (organization_id, module_key);
  end if;
end $$;

-- Add status check constraint if not already present
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_modules_status_check'
  ) then
    alter table public.organization_modules
      add constraint organization_modules_status_check
      check (status in ('active','in_trial','available','locked','expired','coming_soon','inactive'));
  end if;
end $$;

-- Recreate the marketplace view now that columns exist
create or replace view public.organization_module_marketplace as
select
  om.id,
  om.organization_id,
  o.name                as organization_name,
  o.organization_code,
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
  end                   as trial_days_left,
  coalesce(om.module_key, om.module_slug) as module_key,
  coalesce(om.module_name, om.module_slug) as module_name,
  om.module_subtitle,
  coalesce(om.category, 'Operations')     as category,
  om.status,
  om.description,
  om.features,
  coalesce(om.price_monthly, 0)           as price_monthly,
  om.price_label,
  om.included_in_plan,
  om.trial_started_at,
  om.trial_ends_at,
  om.activated_at,
  om.deactivated_at,
  om.created_at,
  om.updated_at
from public.organization_modules om
join public.organizations o on o.id = om.organization_id;

-- Now re-seed Ronyx trial modules from module_registry
insert into public.organization_modules (
  organization_id, module_key, module_name, module_subtitle, category, status,
  description, features, price_monthly, price_label, included_in_plan,
  trial_started_at, trial_ends_at, activated_at
)
select
  o.id, mr.module_key, mr.module_name, mr.module_subtitle, mr.category,
  'in_trial', mr.description, mr.features, mr.price_monthly, mr.price_label,
  mr.included_in_plan, o.pilot_started_at, o.pilot_ends_at, now()
from public.organizations o
cross join public.module_registry mr
where (lower(o.name) like '%ronyx%' or lower(o.organization_code) like '%ronyx%')
  and mr.is_trial_included = true
on conflict (organization_id, module_key)
do update set
  module_name      = excluded.module_name,
  module_subtitle  = excluded.module_subtitle,
  category         = excluded.category,
  status           = 'in_trial',
  description      = excluded.description,
  features         = excluded.features,
  price_monthly    = excluded.price_monthly,
  price_label      = excluded.price_label,
  included_in_plan = excluded.included_in_plan,
  trial_started_at = excluded.trial_started_at,
  trial_ends_at    = excluded.trial_ends_at,
  activated_at     = coalesce(public.organization_modules.activated_at, now()),
  updated_at       = now();

-- Seed available (non-trial) modules for Ronyx
insert into public.organization_modules (
  organization_id, module_key, module_name, module_subtitle, category, status,
  description, features, price_monthly, price_label, included_in_plan
)
select
  o.id, mr.module_key, mr.module_name, mr.module_subtitle, mr.category,
  'available', mr.description, mr.features, mr.price_monthly, mr.price_label,
  mr.included_in_plan
from public.organizations o
cross join public.module_registry mr
where (lower(o.name) like '%ronyx%' or lower(o.organization_code) like '%ronyx%')
  and mr.is_trial_included = false
on conflict (organization_id, module_key)
do update set
  module_name      = excluded.module_name,
  module_subtitle  = excluded.module_subtitle,
  category         = excluded.category,
  description      = excluded.description,
  features         = excluded.features,
  price_monthly    = excluded.price_monthly,
  price_label      = excluded.price_label,
  included_in_plan = excluded.included_in_plan,
  updated_at       = now();

-- ── Validation ────────────────────────────────────────────────────────────────

select
  name, organization_code, status, account_type, subscription_status,
  bypass_subscription, subscription_required, pilot_started_at, pilot_ends_at,
  case
    when status = 'active'
     and account_type = 'free_trial'
     and bypass_subscription = true
     and subscription_required = false
     and pilot_ends_at > now()
    then 'ACCESS_ALLOWED'
    else 'ACCESS_BLOCKED'
  end as access_check
from public.organizations
where lower(name) like '%ronyx%' or lower(organization_code) like '%ronyx%';

select
  o.name,
  count(*)                                        filter (where om.status in ('active','in_trial')) as active_or_trial,
  count(*)                                        filter (where om.status = 'in_trial')             as trial_modules,
  count(*)                                        filter (where om.status = 'available')            as available_modules,
  sum(coalesce(om.price_monthly,0))               filter (where om.status = 'available')            as est_addon_cost
from public.organizations o
left join public.organization_modules om on om.organization_id = o.id
where lower(o.name) like '%ronyx%' or lower(o.organization_code) like '%ronyx%'
group by o.name;

select module_key, module_name, module_subtitle, price_monthly, price_label
from public.module_registry
where module_key = 'ccb';
