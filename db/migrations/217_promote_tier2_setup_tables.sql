-- Migration 217: Promote Tier-2 tables — app-referenced tables that lived ONLY
-- in non-numbered setup files — into the canonical numbered chain. Verbatim DDL
-- from origin files (normalized to public./if-not-exists), with the canonical
-- user_id-based RLS template applied uniformly at the end.
--
-- FIX APPLIED: owner_operators.partner_id referenced profiles(id) in its source,
-- but canonical profiles is keyed on user_id (no id column). Changed to
-- references public.profiles(user_id). See [[project_profiles_schema_divergence]].
--
-- FK note: lead_contacts→agent_leads, fast_scan_results→fast_scan_uploads,
-- payroll_adjustments→payroll_items, ticket_*→tickets, dispatch_*→dispatch_jobs
-- all resolve against tables created earlier in the chain (run 217 after 001-216).

-- ─── billing/subscription sales (src: supabase/migrations/20251123_billing_subscription_sales.sql)
create table if not exists public.agent_commissions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid,
  org_id uuid references public.organizations(id) on delete cascade,
  amount numeric(10,2) not null,
  event text,
  created_at timestamptz default now()
);

create table if not exists public.billing_addons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  addon text not null,
  active boolean default false,
  paid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.agent_leads(id) on delete cascade,
  name text,
  email text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  plan text,
  amount numeric(10,2),
  created_at timestamptz default now()
);

create table if not exists public.user_seats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid,
  seat_type text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─── tickets/payroll schema (src: tickets-payroll-schema.sql)
create table if not exists public.fast_scan_results (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references public.fast_scan_uploads(id) on delete cascade,
  field_name      text not null,
  field_value     text,
  confidence      numeric(4,2),
  source          text default 'ocr',
  created_at      timestamptz default now()
);

create table if not exists public.payroll_adjustments (
  id              uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references public.payroll_items(id) on delete cascade,
  adjustment_type text not null,
  old_amount      numeric(10,2),
  new_amount      numeric(10,2),
  reason          text not null,
  adjusted_by     text,
  created_at      timestamptz default now()
);

create table if not exists public.ticket_attachments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  file_url    text not null,
  file_name   text,
  file_type   text,
  uploaded_by text,
  created_at  timestamptz default now()
);

create table if not exists public.ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  body        text not null,
  author      text,
  is_internal boolean default false,
  created_at  timestamptz default now()
);
create index if not exists idx_ticket_comments_ticket on public.ticket_comments(ticket_id);

-- ─── PIT CSV engine (src: supabase/migrations/pit_csv_engine.sql)
create table if not exists public.pit_csv_formats (
  id uuid primary key default gen_random_uuid(),
  pit_name text,
  sample_filename text,
  column_ticket text,
  column_date text,
  column_material text,
  column_tonnage text,
  column_amount text,
  column_truck text,
  column_job text,
  column_po text,
  delimiter text default ',',
  skip_header boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.pit_csv_imports (
  id uuid primary key default gen_random_uuid(),
  pit_name text,
  organization_id uuid references public.organizations(id),
  ticket_number text,
  date date,
  material text,
  tonnage numeric,
  amount numeric,
  truck_number text,
  job_number text,
  po_number text,
  raw_data jsonb,
  created_at timestamptz default now()
);

-- ─── owner_operators (src: supabase/owner_operators_table.sql) — partner_id FK fixed to profiles(user_id)
create table if not exists public.owner_operators (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  company_name varchar(255) not null,
  contact_name varchar(255) not null,
  contact_email varchar(255),
  contact_phone varchar(50),
  monthly_fee decimal(10,2) default 0.00,
  payment_status varchar(50) default 'Active' check (payment_status in ('Active','Pending','Overdue')),
  truck_count integer default 1,
  trailer_count integer default 0,
  monthly_revenue decimal(12,2) default 0.00,
  rating decimal(2,1) default 0.0 check (rating >= 0.0 and rating <= 5.0),
  partner_id uuid references public.profiles(user_id) on delete cascade,  -- FIXED: was profiles(id)
  status varchar(20) default 'active' check (status in ('active','inactive','suspended'))
);
create index if not exists idx_owner_operators_partner_id     on public.owner_operators(partner_id);
create index if not exists idx_owner_operators_status         on public.owner_operators(status);
create index if not exists idx_owner_operators_payment_status on public.owner_operators(payment_status);

-- ─── dispatch (src: dispatch-schema.sql / dispatch-operations.sql)
create table if not exists public.dispatch_alerts (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references public.dispatch_jobs(id) on delete cascade,
  driver_id    uuid references public.drivers(id) on delete set null,
  vehicle_id   uuid,
  alert_type   text not null,
  severity     text not null check (severity in ('warning','high','critical','blocked')),
  message      text not null,
  is_resolved  boolean not null default false,
  resolved_by  text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_dalert_resolved on public.dispatch_alerts(is_resolved, severity);
create index if not exists idx_dalert_job      on public.dispatch_alerts(job_id);

create table if not exists public.dispatch_overrides (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references public.dispatch_jobs(id) on delete cascade,
  driver_id       uuid references public.drivers(id) on delete set null,
  rule_overridden text not null,
  reason          text not null,
  manager_name    text not null,
  approved        boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_do_job    on public.dispatch_overrides(job_id, created_at desc);
create index if not exists idx_do_driver on public.dispatch_overrides(driver_id, created_at desc);

-- ─── driver compliance notifications (src: driver-compliance-auto.sql)
create table if not exists public.driver_compliance_notifications (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null,
  driver_name   text not null,
  document_type text not null,
  expired_on    date,
  expires_on    date,
  alert_type    text not null,
  status        text not null default 'pending' check (status in ('pending','sent','dismissed')),
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_dcn_driver on public.driver_compliance_notifications(driver_id, created_at desc);
create index if not exists idx_dcn_status on public.driver_compliance_notifications(status);
create index if not exists idx_dcn_type   on public.driver_compliance_notifications(document_type, alert_type);

-- ─── theme settings (src: migrations/003_theme_settings.sql)
create table if not exists public.theme_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz default now()
);

-- ─── admin_users (src: supabase/database-admin-migration.sql)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_users_user_id on public.admin_users(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — canonical template (authenticated + user_id-based super_admin) applied
-- to every table promoted above. Idempotent (drop-then-create).
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'agent_commissions','billing_addons','lead_contacts','subscription_history','user_seats',
    'fast_scan_results','payroll_adjustments','ticket_attachments','ticket_comments',
    'pit_csv_formats','pit_csv_imports','owner_operators','dispatch_alerts','dispatch_overrides',
    'driver_compliance_notifications','theme_settings','admin_users'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'auth_all_'||t, t);
    execute format('create policy %I on public.%I for all using (auth.role() = ''authenticated'')', 'auth_all_'||t, t);
    execute format('drop policy if exists %I on public.%I', 'super_admin_'||t, t);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.profiles p '
      || 'where p.user_id = auth.uid() and (lower(coalesce(p.role,'''')) in (''super_admin'',''super admin'') '
      || 'or p.is_platform_admin = true)))', 'super_admin_'||t, t);
  end loop;
end $$;
