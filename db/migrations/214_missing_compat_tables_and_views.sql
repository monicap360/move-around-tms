-- Migration 214: Create genuinely-missing tables and views surfaced by the
-- code-vs-schema audit (2026-06-24). Safe to re-run (IF NOT EXISTS / OR REPLACE).
--
-- Scope: ONLY tables/views that are referenced in app code but defined NOWHERE
-- in any .sql file. Name-mismatch cases (subscriptions, mileage_logs,
-- fuel_receipts, esign, payments, users, vehicles) are fixed in app code, NOT
-- here — we do not create duplicate sources of truth. See the rename checklist.
--
-- "hr" is intentionally NOT created: 3 of 4 references are the `hr` STORAGE
-- bucket (supabase.storage.from('hr')); the one real table query in
-- app/company-dashboard/[companyId]/page.tsx is a speculative dashboard and is
-- handled in app code.

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Core domain tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. compliance_alerts ────────────────────────────────────────────────────
-- Used by app/lib/integrationApi.ts: .eq('acknowledged', false),
-- .order('created_at'), update {acknowledged, acknowledged_date}.
create table if not exists public.compliance_alerts (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references public.organizations(id) on delete cascade,
  alert_type        text not null default 'general',
  severity          text not null default 'medium' check (severity in ('low','medium','high','critical')),
  title             text,
  message           text,
  related_entity    text,
  related_id        text,
  acknowledged      boolean not null default false,
  acknowledged_by   uuid,
  acknowledged_date timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists compliance_alerts_org_idx          on public.compliance_alerts(organization_id);
create index if not exists compliance_alerts_acknowledged_idx on public.compliance_alerts(acknowledged);
create index if not exists compliance_alerts_created_idx      on public.compliance_alerts(created_at desc);

-- ─── 2. reports ──────────────────────────────────────────────────────────────
-- Used by app/api/company/.../reports/route.ts: insert {...body, organization_id},
-- select by organization_id order created_at. Route already tolerates absence.
create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  report_type     text not null default 'custom',
  name            text,
  description     text,
  parameters      jsonb not null default '{}'::jsonb,
  data            jsonb,
  file_url        text,
  status          text not null default 'completed',
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists reports_org_idx     on public.reports(organization_id);
create index if not exists reports_created_idx on public.reports(created_at desc);

-- ─── 3. load_contracts ───────────────────────────────────────────────────────
-- Used by app/marketplace/my-loads/page.tsx: upsert {load_id, signed,
-- signed_at, user_id}. upsert needs a unique key on load_id.
create table if not exists public.load_contracts (
  id         uuid primary key default gen_random_uuid(),
  load_id    uuid not null references public.loads(id) on delete cascade,
  signed     boolean not null default false,
  signed_at  timestamptz,
  user_id    uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (load_id)
);
create index if not exists load_contracts_load_idx on public.load_contracts(load_id);

-- ─── 4. customer_profiles ────────────────────────────────────────────────────
-- Used by app/customer-portal/page.tsx: upsert {user_id, primary_contact,
-- phone, email, updated_at}. upsert needs a unique key on user_id.
create table if not exists public.customer_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  primary_contact text,
  phone           text,
  email           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id)
);
create index if not exists customer_profiles_user_idx on public.customer_profiles(user_id);
create index if not exists customer_profiles_org_idx  on public.customer_profiles(organization_id);

-- ─── 5. billing  (LEGACY-COMPAT — review before relying on it) ────────────────
-- Used ONLY by app/partners/[slug]/dashboard/page.tsx:
--   .from('billing').select('*').eq('partner_slug', ...)
-- A richer billing model already exists: billing_payments,
-- organization_billing_events, organization_subscriptions. This table exists
-- purely so the partner dashboard query resolves. RECOMMENDATION: migrate the
-- dashboard to billing_payments and drop this table, rather than splitting
-- billing data across two sources of truth.
create table if not exists public.billing (
  id            uuid primary key default gen_random_uuid(),
  partner_slug  text,
  organization_id uuid references public.organizations(id) on delete cascade,
  period_start  date,
  period_end    date,
  amount        numeric(12,2),
  status        text not null default 'pending',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists billing_partner_slug_idx on public.billing(partner_slug);
create index if not exists billing_org_idx          on public.billing(organization_id);
comment on table public.billing is 'LEGACY-COMPAT (mig 214): satisfies partner dashboard query only. Prefer billing_payments. Consider dropping after dashboard migration.';

-- ─── 6. subscriptions  (COMPAT — distinct from organization_subscriptions) ────
-- WHY THIS EXISTS / DO NOT "RENAME": app/api/admin/override/route.ts and
-- app/supabase/functions/auto-expire-override.ts drive an ADMIN-OVERRIDE flow
-- on columns (admin_override, override_active, override_type, override_expires_at)
-- that DO NOT exist on organization_subscriptions (which models Stripe
-- plans/periods). Renaming these queries to organization_subscriptions would
-- silently drop every override column. This is a separate entity.
-- FUTURE PATH: to consolidate, add the override_* columns to
-- organization_subscriptions, backfill from here, repoint code, then drop this.
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations(id) on delete cascade,
  status              text not null default 'active',
  admin_override      boolean not null default false,
  override_active     boolean not null default false,
  override_type       text,            -- 'permanent' | 'temporary' | null
  override_expires_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
-- Index (NON-UNIQUE for now): the override route updates by organization_id.
-- A unique(organization_id) constraint is the eventual goal (one sub per org,
-- enables upsert-by-org), but it is DEFERRED to a follow-up migration to avoid
-- an apply-time failure if any environment already has duplicate rows per org.
-- Hardening path: audit + dedupe duplicates, then add the unique constraint.
create index if not exists subscriptions_org_idx on public.subscriptions(organization_id);

-- ─── 7. fuel_receipts  (COMPAT — distinct from fuel_purchases) ────────────────
-- WHY THIS EXISTS / DO NOT "RENAME": app/compliance/ifta-reports-tab.tsx stores
-- UPLOADED IFTA fuel receipts — denormalized text fields (driver_truck_number,
-- vendor), an upload_date, and a file_url to the stored document. fuel_purchases
-- is the NORMALIZED transactional table (driver_id/truck_id FKs,
-- transaction_date, provider) and has none of upload_date/vendor/
-- driver_truck_number. Renaming would break both the reads and the inserts.
-- FUTURE PATH: migrate the IFTA tab onto fuel_purchases, backfill, then drop.
create table if not exists public.fuel_receipts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations(id) on delete cascade,
  upload_date         date,
  driver_truck_number text,
  fuel_type           text,
  gallons             numeric(10,2),
  cost_per_gallon     numeric(10,4),
  total_cost          numeric(12,2),
  location            text,
  vendor              text,
  file_url            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists fuel_receipts_org_idx    on public.fuel_receipts(organization_id);
create index if not exists fuel_receipts_upload_idx on public.fuel_receipts(upload_date desc);

-- ─── 8. mileage_logs  (COMPAT — distinct from ifta_mileage_logs) ──────────────
-- WHY THIS EXISTS / DO NOT "RENAME": app/compliance/ifta-reports-tab.tsx stores
-- UPLOADED IFTA mileage logs — denormalized text fields (truck_number,
-- driver_name, jurisdiction_miles), an upload_date, and a file_url.
-- ifta_mileage_logs is the normalized table (driver_id FK, log_date,
-- start_miles/end_miles) and lacks all of those. Renaming would break it.
-- FUTURE PATH: migrate the IFTA tab onto ifta_mileage_logs, backfill, then drop.
create table if not exists public.mileage_logs (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid references public.organizations(id) on delete cascade,
  upload_date        date,
  truck_number       text,
  driver_name        text,
  start_odometer     numeric(12,1),
  end_odometer       numeric(12,1),
  total_miles        numeric(12,1),
  jurisdiction_miles text,
  file_url           text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists mileage_logs_org_idx    on public.mileage_logs(organization_id);
create index if not exists mileage_logs_upload_idx on public.mileage_logs(upload_date desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — RLS (match the project convention from migration 213:
-- permissive authenticated policy; service role bypasses RLS)
-- ═══════════════════════════════════════════════════════════════════════════

alter table if exists public.compliance_alerts enable row level security;
alter table if exists public.reports           enable row level security;
alter table if exists public.load_contracts    enable row level security;
alter table if exists public.customer_profiles enable row level security;
alter table if exists public.billing           enable row level security;
alter table if exists public.subscriptions     enable row level security;
alter table if exists public.fuel_receipts     enable row level security;
alter table if exists public.mileage_logs      enable row level security;

-- Postgres has no CREATE POLICY IF NOT EXISTS; drop-then-create is the
-- idempotent, re-runnable equivalent.
drop policy if exists "auth_all_compliance_alerts" on public.compliance_alerts;
create policy "auth_all_compliance_alerts"
  on public.compliance_alerts for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_reports" on public.reports;
create policy "auth_all_reports"
  on public.reports for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_load_contracts" on public.load_contracts;
create policy "auth_all_load_contracts"
  on public.load_contracts for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_customer_profiles" on public.customer_profiles;
create policy "auth_all_customer_profiles"
  on public.customer_profiles for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_billing" on public.billing;
create policy "auth_all_billing"
  on public.billing for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_subscriptions" on public.subscriptions;
create policy "auth_all_subscriptions"
  on public.subscriptions for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_fuel_receipts" on public.fuel_receipts;
create policy "auth_all_fuel_receipts"
  on public.fuel_receipts for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_mileage_logs" on public.mileage_logs;
create policy "auth_all_mileage_logs"
  on public.mileage_logs for all using (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — Views
-- security_invoker=true so the querying user's RLS on base tables applies
-- (Postgres 15+/Supabase). Filters below are best-effort from observed usage;
-- adjust the status/threshold predicates to match your real enum values.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 6. v_tickets_for_review ─────────────────────────────────────────────────
-- Used by app/dashboard/hr-payroll/page.tsx: select * order created_at.
-- "For review" = tickets not yet in a terminal state, or held for payroll.
create or replace view public.v_tickets_for_review
  with (security_invoker = true) as
select t.*
from public.tickets t
where coalesce(lower(t.status), '') not in ('approved','resolved','closed','void','rejected','paid')
   or coalesce(lower(t.payroll_status), '') = 'hold';

-- ─── 7. vw_weekly_payroll ────────────────────────────────────────────────────
-- Used by app/payroll/page.tsx: select * where .eq('pay_day', weekStart).
-- driver_weekly_payroll_summary (mig 004/005) already computes Friday-ending
-- weeks; expose its week_end as pay_day so the filter resolves.
create or replace view public.vw_weekly_payroll
  with (security_invoker = true) as
select
  s.*,
  s.week_end as pay_day
from public.driver_weekly_payroll_summary s;

-- ─── 8. onboarding_progress_summary ──────────────────────────────────────────
-- Used by app/hr/onboarding/page.tsx: select * order started_date desc.
-- Aggregates per-driver onboarding progress from driver_onboarding +
-- onboarding_step_completion (joined on driver_email).
create or replace view public.onboarding_progress_summary
  with (security_invoker = true) as
select
  o.id,
  o.driver_email,
  o.status,
  o.current_step,
  o.started_at                                            as started_date,
  o.updated_at,
  count(c.*)                                              as steps_total,
  count(c.*) filter (where c.completed)                   as steps_completed,
  case when count(c.*) > 0
       then round(100.0 * count(c.*) filter (where c.completed) / count(c.*), 1)
       else 0 end                                         as progress_pct
from public.driver_onboarding o
left join public.onboarding_step_completion c
       on c.driver_email = o.driver_email
group by o.id, o.driver_email, o.status, o.current_step, o.started_at, o.updated_at;

-- ─── 9. overdue_onboarding_tasks ─────────────────────────────────────────────
-- Used by app/hr/onboarding/page.tsx: select * limit 10.
-- Incomplete onboarding steps for drivers whose onboarding began > 7 days ago.
create or replace view public.overdue_onboarding_tasks
  with (security_invoker = true) as
select
  c.id,
  c.driver_email,
  c.step_name,
  c.step_order,
  o.started_at,
  (current_date - o.started_at::date)                     as days_outstanding
from public.onboarding_step_completion c
join public.driver_onboarding o
  on o.driver_email = c.driver_email
where coalesce(c.completed, false) = false
  and o.started_at < now() - interval '7 days'
order by o.started_at asc;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — trucks fleet-column extension (B-item for the `vehicles` ref)
-- app/fleet/FleetView.tsx queried a non-existent `vehicles` table whose shape
-- (make/model/year/registration_expiry/dot_inspection_due/current_mileage/…)
-- is far richer than `trucks` (truck_number/plate_number/vin/color/status).
-- Rather than create a SECOND fleet entity, we extend the canonical `trucks`
-- table and repoint FleetView at it with an aliased select (see code change:
--   .from('trucks').select('id, unit_number:truck_number, make, model, year,
--      vin, license_plate:plate_number, registration_expiry, insurance_expiry,
--      dot_inspection_due, last_maintenance, next_maintenance_due,
--      current_mileage, status, driver_assigned, location')
-- which maps truck_number→unit_number and plate_number→license_plate so the
-- existing Vehicle type needs no change). DO NOT create a `vehicles` table.
-- ═══════════════════════════════════════════════════════════════════════════
alter table if exists public.trucks add column if not exists make                 text;
alter table if exists public.trucks add column if not exists model                text;
alter table if exists public.trucks add column if not exists year                 integer;
alter table if exists public.trucks add column if not exists registration_expiry  date;
alter table if exists public.trucks add column if not exists insurance_expiry     date;
alter table if exists public.trucks add column if not exists dot_inspection_due   date;
alter table if exists public.trucks add column if not exists last_maintenance     date;
alter table if exists public.trucks add column if not exists next_maintenance_due date;
alter table if exists public.trucks add column if not exists current_mileage      numeric(12,1);
alter table if exists public.trucks add column if not exists driver_assigned      text;
alter table if exists public.trucks add column if not exists location             text;
-- Note: FleetView filters status on 'active' | 'maintenance' | 'out_of_service'.
-- trucks.status is free text and not constrained here; ensure rows use those
-- values (or relax the FleetView filter) so the status counters populate.
