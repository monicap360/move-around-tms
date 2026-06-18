-- ============================================================
-- Migration 167: Module Marketplace + Ronyx Trial Modules
-- File: db/migrations/167_modules_marketplace.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Make sure organization trial fields exist
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
-- 2. Helper updated_at function
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ------------------------------------------------------------
-- 3. Create module registry
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

drop trigger if exists set_module_registry_updated_at on public.module_registry;

create trigger set_module_registry_updated_at
before update on public.module_registry
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 4. Create organization modules table
-- ------------------------------------------------------------

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_modules_status_check'
  ) then
    alter table public.organization_modules
    add constraint organization_modules_status_check
    check (
      status in (
        'active',
        'in_trial',
        'available',
        'locked',
        'expired',
        'coming_soon',
        'inactive'
      )
    );
  end if;
end $$;

drop trigger if exists set_organization_modules_updated_at on public.organization_modules;

create trigger set_organization_modules_updated_at
before update on public.organization_modules
for each row
execute function public.set_updated_at();


-- ------------------------------------------------------------
-- 5. Enable RLS
-- ------------------------------------------------------------

alter table public.organization_modules enable row level security;

create or replace function public.current_user_org()
returns uuid
language sql
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

drop policy if exists "Organization members can view organization modules"
on public.organization_modules;

create policy "Organization members can view organization modules"
on public.organization_modules
for select
using (
  organization_id = public.current_user_org()
);

drop policy if exists "Organization members can manage organization modules"
on public.organization_modules;

create policy "Organization members can manage organization modules"
on public.organization_modules
for all
using (
  organization_id = public.current_user_org()
)
with check (
  organization_id = public.current_user_org()
);


-- ------------------------------------------------------------
-- 6. Seed module registry
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
values

-- Operations
(
  'dispatch_command_center',
  'Dispatch Command Center™',
  'Operations',
  'Operations',
  'Control tower for jobs, drivers, trucks, tickets, payroll, billing, and compliance.',
  array[
    'Job board',
    'Smart assignment',
    'Driver and truck eligibility',
    'Ticket-needed workflow',
    'End-of-day routing'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  10,
  true,
  false
),
(
  'dispatch_guard',
  'Dispatch Guard™',
  'Pre-dispatch protection engine',
  'Operations',
  'Pre-dispatch protection that checks every job before it goes out.',
  array[
    'Driver compliance checks',
    'Truck compliance checks',
    'Owner operator COI checks',
    'Payment hold checks',
    'Payroll and billing readiness checks'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  20,
  true,
  false
),
(
  'driver_management',
  'Driver Management',
  'Operations',
  'Operations',
  'Manage drivers, contacts, eligibility, documents, status, and assignment readiness.',
  array[
    'Driver profiles',
    'Document tracking',
    'Dispatch eligibility',
    'Driver status',
    'Assignment history'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  30,
  true,
  false
),
(
  'fleet_equipment',
  'Fleet & Equipment',
  'Operations',
  'Operations',
  'Manage trucks, trailers, equipment, inspections, service issues, and dispatch readiness.',
  array[
    'Truck profiles',
    'Equipment status',
    'Inspection tracking',
    'Maintenance flags',
    'Dispatch eligibility'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  40,
  true,
  false
),
(
  'owner_operator_hub',
  'Owner Operator Hub',
  'Operations',
  'Operations',
  'Manage owner operators, sub-haulers, contracts, insurance, drivers, trucks, and settlements.',
  array[
    'Owner operator profiles',
    'Contract tracking',
    'COI tracking',
    'Settlement readiness',
    'Dispatch eligibility'
  ],
  'available',
  0,
  'Included in Operations Pro, Enterprise & Enterprise Plus',
  array['operations_pro', 'enterprise', 'enterprise_plus'],
  50,
  true,
  false
),
(
  'customer_project_management',
  'Customer / Project Management',
  'Operations',
  'Operations',
  'Manage customers, projects, job sites, rates, purchase orders, and dispatch requirements.',
  array[
    'Customer profiles',
    'Project numbers',
    'PO tracking',
    'Rate setup',
    'Job requirements'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  60,
  true,
  false
),
(
  'live_tracking',
  'Live Tracking',
  'Operations',
  'Operations',
  'Track job activity, driver movement, route progress, and live dispatch updates.',
  array[
    'Live job status',
    'Driver activity',
    'Late/risk alerts',
    'Route visibility',
    'Dispatch updates'
  ],
  'available',
  0,
  'Included in Pro, Enterprise & Enterprise Plus',
  array['pro', 'enterprise', 'enterprise_plus'],
  70,
  false,
  false
),
(
  'end_of_day_review',
  'End of Day Review',
  'Operations',
  'Operations',
  'Close the day by checking missing tickets, payroll holds, billing holds, and unresolved dispatch issues.',
  array[
    'Missing ticket check',
    'Payroll hold check',
    'Billing hold check',
    'Late job review',
    'Closeout summary'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  80,
  true,
  false
),
(
  'reports',
  'Reports',
  'Operations',
  'Operations',
  'Operational reports for dispatch, tickets, payroll, billing, compliance, and owner review.',
  array[
    'Dispatch reports',
    'Ticket reports',
    'Payroll reports',
    'Billing reports',
    'Compliance reports'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  90,
  true,
  false
),

-- Tickets & OCR
(
  'fast_scan',
  'Fast Scan™',
  'Tickets & OCR',
  'Tickets & OCR',
  'Upload, scan, read, match, review, and route tickets into payroll and billing workflows.',
  array[
    'Ticket upload',
    'OCR extraction',
    'Job matching',
    'Payroll routing',
    'Billing routing'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  100,
  true,
  false
),
(
  'all_tickets',
  'All Tickets / Ticket Ledger™',
  'Tickets & OCR',
  'Tickets & OCR',
  'Complete ticket ledger for uploaded, scanned, matched, reviewed, payroll-ready, and billing-ready tickets.',
  array[
    'Ticket list',
    'Ticket viewer',
    'Print ticket',
    'Email ticket',
    'Audit trail'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  110,
  true,
  false
),
(
  'ocr_review_queue',
  'OCR Review Queue',
  'Tickets & OCR',
  'Tickets & OCR',
  'Review OCR fields, confidence scores, failed reads, missing drivers, missing trucks, and ticket mismatches.',
  array[
    'OCR confidence',
    'Review queue',
    'Correction workflow',
    'Exception routing',
    'Approval tracking'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  120,
  true,
  false
),
(
  'invoice_reconciliation',
  'Invoice Reconciliation',
  'Tickets & OCR',
  'Tickets & OCR',
  'Compare pit/vendor invoices, uploaded tickets, Excel sheets, and billing records to find mismatches.',
  array[
    'Invoice upload',
    'Excel matching',
    'Ticket comparison',
    'Mismatch detection',
    'Correction workflow'
  ],
  'available',
  0,
  'Included in Operations Pro, Enterprise & Enterprise Plus',
  array['operations_pro', 'enterprise', 'enterprise_plus'],
  130,
  false,
  false
),
(
  'pit_vendor_master',
  'Pit / Vendor Master',
  'Tickets & OCR',
  'Tickets & OCR',
  'Manage pits, plants, vendors, materials, ticket formats, and invoice matching rules.',
  array[
    'Vendor profiles',
    'Pit locations',
    'Material setup',
    'Ticket rules',
    'Invoice rules'
  ],
  'available',
  0,
  'Included in Operations Pro, Enterprise & Enterprise Plus',
  array['operations_pro', 'enterprise', 'enterprise_plus'],
  140,
  false,
  false
),
(
  'ticket_audit_trail',
  'Ticket Audit Trail',
  'Tickets & OCR',
  'Tickets & OCR',
  'Track every ticket view, edit, print, email, download, approval, payroll send, and billing send.',
  array[
    'View history',
    'Print history',
    'Email history',
    'Approval history',
    'Change history'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  150,
  false,
  false
),

-- Billing & Payroll
(
  'payroll_review',
  'Payroll Review',
  'Billing & Payroll',
  'Billing & Payroll',
  'Review scanned tickets, driver pay, owner operator settlement readiness, holds, and approvals.',
  array[
    'Payroll queue',
    'Ticket-to-pay matching',
    'Payroll holds',
    'Driver pay preview',
    'Approval workflow'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  200,
  true,
  false
),
(
  'driver_settlements',
  'Driver Settlements',
  'Billing & Payroll',
  'Billing & Payroll',
  'Prepare driver settlement reports, payroll review packets, deductions, advances, and reimbursements.',
  array[
    'Settlement reports',
    'Deductions',
    'Advances',
    'Reimbursements',
    'Approval history'
  ],
  'available',
  0,
  'Included in Operations Pro, Enterprise & Enterprise Plus',
  array['operations_pro', 'enterprise', 'enterprise_plus'],
  210,
  false,
  false
),
(
  'owner_operator_settlements',
  'Owner Operator Settlements',
  'Billing & Payroll',
  'Billing & Payroll',
  'Prepare owner operator settlements, holds, deductions, invoice support, and payment review.',
  array[
    'OO settlements',
    'Settlement holds',
    'Deductions',
    'Ticket support',
    'Payment review'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  220,
  false,
  false
),
(
  'billing_ready',
  'Billing Ready Queue',
  'Billing & Payroll',
  'Billing & Payroll',
  'Review tickets and jobs that are ready for customer billing.',
  array[
    'Billing queue',
    'Ticket approval check',
    'Rate check',
    'Customer invoice readiness',
    'Hold tracking'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  230,
  true,
  false
),
(
  'invoice_builder',
  'Invoice Builder',
  'Billing & Payroll',
  'Billing & Payroll',
  'Generate customer invoices from approved tickets, jobs, rates, and reconciliation records.',
  array[
    'Invoice generation',
    'Approved ticket batching',
    'Customer rates',
    'Billing review',
    'Export support'
  ],
  'available',
  0,
  'Included in Operations Pro, Enterprise & Enterprise Plus',
  array['operations_pro', 'enterprise', 'enterprise_plus'],
  240,
  false,
  false
),
(
  'receivables',
  'Receivables',
  'Billing & Payroll',
  'Billing & Payroll',
  'Track open invoices, customer balances, payment holds, and aging reports.',
  array[
    'Open invoices',
    'Balance tracking',
    'Payment holds',
    'Aging reports',
    'Customer risk'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  250,
  false,
  false
),

-- Compliance
(
  'driver_compliance',
  'Driver Compliance',
  'Compliance',
  'Compliance',
  'Track CDL, medical card, MVR, drug test, background check, reminders, and dispatch eligibility.',
  array[
    'CDL tracking',
    'Medical card tracking',
    'MVR tracking',
    'Drug test tracking',
    'Dispatch blocking'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  300,
  true,
  false
),
(
  'fleet_compliance',
  'Fleet Compliance',
  'Compliance',
  'Compliance',
  'Track registration, inspection, insurance, cab cards, maintenance issues, and truck eligibility.',
  array[
    'Registration tracking',
    'Insurance tracking',
    'Inspection tracking',
    'Cab cards',
    'Truck blocking'
  ],
  'available',
  0,
  'Included in Trial, Pro, Enterprise & Enterprise Plus',
  array['trial', 'pro', 'enterprise', 'enterprise_plus'],
  310,
  true,
  false
),
(
  'customer_requirements',
  'Customer Dispatch Requirements',
  'Compliance',
  'Compliance',
  'Track customer-specific dispatch requirements for drivers, trucks, owner operators, COIs, and documents.',
  array[
    'Customer rules',
    'Document requirements',
    'Role assignment',
    'Dispatch blockers',
    'Override tracking'
  ],
  'available',
  0,
  'Included in Trial, Operations Pro, Enterprise & Enterprise Plus',
  array['trial', 'operations_pro', 'enterprise', 'enterprise_plus'],
  320,
  true,
  false
),
(
  'insurance_coi_tracker',
  'Insurance / COI Tracker',
  'Compliance',
  'Compliance',
  'Track auto liability, general liability, cargo, workers comp, and COI expiration risk.',
  array[
    'Auto liability',
    'General liability',
    'Cargo COI',
    'Expiration alerts',
    'Dispatch holds'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  330,
  false,
  false
),
(
  'ifta',
  'IFTA',
  'Compliance',
  'Compliance',
  'Track fuel, mileage, jurisdictions, reporting support, and audit information.',
  array[
    'Fuel tracking',
    'Mileage tracking',
    'Jurisdiction reports',
    'Audit support',
    'Export support'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  340,
  false,
  false
),
(
  'maintenance_compliance',
  'Maintenance Compliance',
  'Compliance',
  'Compliance',
  'Track maintenance issues, inspection risks, out-of-service status, and truck readiness.',
  array[
    'Maintenance issues',
    'Service alerts',
    'Out-of-service tracking',
    'Inspection holds',
    'Fleet readiness'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  350,
  false,
  false
),

-- AI / Automation
(
  'fast_dispatch',
  'Fast Dispatch™',
  'AI Add-On',
  'AI / Automation',
  'Virtual dispatcher powered by MoveAround TMS for AI-assisted dispatch recommendations.',
  array[
    'Recommend best driver',
    'Check dispatch blockers',
    'Driver/truck eligibility',
    'Late/risk alerts',
    'Missing ticket alerts',
    'Send completed jobs to Fast Scan',
    'Payroll and billing routing suggestions'
  ],
  'available',
  299,
  '+$299/mo add-on · Included in Pro, Enterprise & Enterprise Plus',
  array['pro', 'enterprise', 'enterprise_plus'],
  400,
  false,
  false
),
(
  'smart_assign',
  'Smart Assign',
  'AI / Automation',
  'AI / Automation',
  'Recommend the best driver and truck based on availability, eligibility, location, and job requirements.',
  array[
    'Best driver recommendation',
    'Truck recommendation',
    'Eligibility scoring',
    'Risk alerts',
    'Assignment reasoning'
  ],
  'available',
  0,
  'Included in Fast Dispatch™, Pro, Enterprise & Enterprise Plus',
  array['pro', 'enterprise', 'enterprise_plus'],
  410,
  false,
  false
),
(
  'dispatch_guard_ai',
  'Dispatch Guard AI',
  'AI / Automation',
  'AI / Automation',
  'AI-assisted blocker detection for dispatch, compliance, payments, tickets, payroll, and billing.',
  array[
    'Blocker detection',
    'Risk explanation',
    'Suggested fixes',
    'Override review',
    'Office action routing'
  ],
  'available',
  0,
  'Included in Fast Dispatch™, Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  420,
  false,
  false
),
(
  'missing_ticket_alerts',
  'Missing Ticket Alerts',
  'AI / Automation',
  'AI / Automation',
  'Automatically identify completed jobs that need tickets before payroll and billing can proceed.',
  array[
    'Completed job check',
    'Ticket-needed alerts',
    'Payroll hold routing',
    'Billing hold routing',
    'End-of-day warnings'
  ],
  'available',
  0,
  'Included in Fast Dispatch™, Operations Pro, Enterprise & Enterprise Plus',
  array['operations_pro', 'enterprise', 'enterprise_plus'],
  430,
  false,
  false
),
(
  'payroll_hold_automation',
  'Payroll Hold Automation',
  'AI / Automation',
  'AI / Automation',
  'Automatically hold payroll when required tickets, proof, rates, or approvals are missing.',
  array[
    'Payroll hold rules',
    'Missing proof detection',
    'Rate checks',
    'Approval checks',
    'Release workflow'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  440,
  false,
  false
),
(
  'billing_hold_automation',
  'Billing Hold Automation',
  'AI / Automation',
  'AI / Automation',
  'Automatically hold billing when tickets, rates, invoice matching, or approval checks fail.',
  array[
    'Billing hold rules',
    'Ticket approval checks',
    'Rate checks',
    'Invoice mismatch checks',
    'Release workflow'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  450,
  false,
  false
),

-- Enterprise Add-Ons
(
  'ccb',
  'Carrier Clearance Bureau™',
  'CCB™ · Enterprise Add-On',
  'Enterprise Add-Ons',
  'Carrier vetting, clearance status, billing risk, compliance controls, dispatch holds, account blocks, and audit history for owner operators and sub-haulers.',
  array[
    'Carrier vetting',
    'Clearance status',
    'Billing risk controls',
    'Compliance controls',
    'Dispatch holds',
    'Account blocks',
    'Audit history'
  ],
  'available',
  199,
  '+$199/mo base · Includes up to 10 owner operators · +$10/mo per additional owner operator',
  array['enterprise', 'enterprise_plus'],
  500,
  false,
  true
),
(
  'customer_portal',
  'Customer Portal',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Give customers access to approved tickets, job status, billing support, and document history.',
  array[
    'Customer access',
    'Ticket visibility',
    'Job status',
    'Billing support',
    'Document history'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  510,
  false,
  true
),
(
  'driver_portal',
  'Driver Portal',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Give drivers access to assignments, ticket uploads, document reminders, and status updates.',
  array[
    'Driver assignments',
    'Ticket upload',
    'Document reminders',
    'Status updates',
    'Mobile workflow'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  520,
  false,
  true
),
(
  'owner_operator_portal',
  'Owner Operator Portal',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Give owner operators access to documents, trucks, drivers, tickets, compliance, and settlements.',
  array[
    'OO access',
    'Document uploads',
    'Truck visibility',
    'Settlement support',
    'Compliance reminders'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  530,
  false,
  true
),
(
  'audit_center',
  'Audit Center',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Centralized audit history for dispatch, tickets, payroll, billing, compliance, emails, and prints.',
  array[
    'Dispatch audit',
    'Ticket audit',
    'Payroll audit',
    'Billing audit',
    'Compliance audit'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  540,
  false,
  true
),
(
  'api_integrations',
  'API Integrations',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Connect MoveAround TMS to external systems, customer portals, accounting systems, and data feeds.',
  array[
    'API access',
    'External integrations',
    'Data sync',
    'Customer connections',
    'Custom workflows'
  ],
  'available',
  0,
  'Custom pricing',
  array['enterprise_plus'],
  550,
  false,
  true
),
(
  'multi_company_workspace',
  'Multi-Company Workspace',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Support multiple company workspaces, organization isolation, cross-company permissions, and enterprise admin views.',
  array[
    'Multiple organizations',
    'Tenant separation',
    'Enterprise admin',
    'Workspace switching',
    'Security controls'
  ],
  'available',
  0,
  'Included in Enterprise Plus',
  array['enterprise_plus'],
  560,
  false,
  true
),
(
  'role_permissions',
  'Role Permissions',
  'Enterprise Add-On',
  'Enterprise Add-Ons',
  'Control access by owner, admin, dispatcher, compliance, payroll, billing, viewer, and driver roles.',
  array[
    'Role-based access',
    'Permission controls',
    'Office user roles',
    'Driver role',
    'Audit support'
  ],
  'available',
  0,
  'Included in Enterprise & Enterprise Plus',
  array['enterprise', 'enterprise_plus'],
  570,
  false,
  true
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
  is_trial_included = excluded.is_trial_included,
  is_enterprise_add_on = excluded.is_enterprise_add_on,
  updated_at = now();


-- ------------------------------------------------------------
-- 7. Activate Ronyx 30-day free trial
-- ------------------------------------------------------------

update public.organizations
set
  status = 'active',
  account_type = 'free_trial',
  subscription_status = 'trial_active',
  bypass_subscription = true,
  subscription_required = false,
  pilot_started_at = coalesce(pilot_started_at, now()),
  pilot_ends_at = coalesce(pilot_started_at, now()) + interval '30 days',
  pilot_notes = 'Ronyx 30-day free trial. Subscription pages bypassed during trial period.'
where lower(name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%';


-- ------------------------------------------------------------
-- 8. Add Ronyx trial modules
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
  updated_at = now();


-- ------------------------------------------------------------
-- 9. Add Ronyx available non-trial modules
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
  included_in_plan
)
select
  o.id,
  mr.module_key,
  mr.module_name,
  mr.module_subtitle,
  mr.category,
  'available',
  mr.description,
  mr.features,
  mr.price_monthly,
  mr.price_label,
  mr.included_in_plan
from public.organizations o
cross join public.module_registry mr
where (lower(o.name) like '%ronyx%' or lower(o.organization_code) like '%ronyx%')
  and mr.is_trial_included = false
on conflict (organization_id, module_key)
do update set
  module_name = excluded.module_name,
  module_subtitle = excluded.module_subtitle,
  category = excluded.category,
  description = excluded.description,
  features = excluded.features,
  price_monthly = excluded.price_monthly,
  price_label = excluded.price_label,
  included_in_plan = excluded.included_in_plan,
  updated_at = now();


-- ------------------------------------------------------------
-- 10. Marketplace view
-- ------------------------------------------------------------

create or replace view public.organization_module_marketplace as
select
  om.id,
  om.organization_id,
  o.name as organization_name,
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
  om.updated_at
from public.organization_modules om
join public.organizations o
  on o.id = om.organization_id;


-- ------------------------------------------------------------
-- 11. Validation checks
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


select
  o.name as organization_name,
  count(*) filter (where om.status in ('active', 'in_trial')) as active_or_trial_modules,
  count(*) filter (where om.status = 'in_trial') as trial_modules,
  count(*) filter (where om.status = 'available') as available_modules,
  sum(case when om.status = 'available' then coalesce(om.price_monthly, 0) else 0 end) as estimated_available_addon_cost
from public.organizations o
left join public.organization_modules om
  on om.organization_id = o.id
where lower(o.name) like '%ronyx%'
   or lower(o.organization_code) like '%ronyx%'
group by o.name;


select
  module_key,
  module_name,
  module_subtitle,
  price_monthly,
  price_label
from public.module_registry
where module_key = 'ccb';
