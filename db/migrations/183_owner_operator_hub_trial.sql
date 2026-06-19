-- Migration 183: Force Owner Operator Hub into active trial for Ronyx
-- Run this in Supabase SQL editor to make Owner Operator Hub accessible during the 30-day trial.

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
  'owner_operator_hub',
  'Owner Operator Hub',
  'Operations',
  'Operations',
  'in_trial',
  'Manage owner operators, sub-haulers, contracts, insurance, drivers, trucks, documents, compliance, dispatch eligibility, and settlements.',
  array[
    'Owner operator profiles',
    'Sub-hauler management',
    'Contract tracking',
    'COI tracking',
    'Driver and truck assignment',
    'Settlement readiness',
    'Dispatch eligibility',
    'Compliance holds'
  ],
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  coalesce(o.pilot_started_at, now()),
  coalesce(o.pilot_ends_at, now() + interval '30 days'),
  now()
from public.organizations o
where lower(o.name) like '%ronyx%'
   or lower(o.organization_code) like '%ronyx%'
on conflict (organization_id, module_key)
do update set
  status           = 'in_trial',
  trial_started_at = excluded.trial_started_at,
  trial_ends_at    = excluded.trial_ends_at,
  activated_at     = coalesce(public.organization_modules.activated_at, now()),
  deactivated_at   = null,
  updated_at       = now();

-- Verify result
select
  organization_name,
  module_key,
  module_name,
  status,
  trial_ends_at
from public.organization_module_marketplace
where module_key = 'owner_operator_hub'
  and (
    lower(organization_name) like '%ronyx%'
    or lower(organization_code) like '%ronyx%'
  );
