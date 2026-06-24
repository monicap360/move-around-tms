-- Migration 216: dependency-safe creation of the two onboarding views from 214
-- that failed because their base tables were missing in this environment
-- (driver_onboarding from 206, onboarding_step_completion from 210 — same
-- partial-apply pattern as the 187 buckets). This ensures both base tables
-- exist (exact schemas from 206/210), then creates the views as authored.
-- Idempotent: IF NOT EXISTS + OR REPLACE + drop-then-create policies.

-- ── 1. Base tables (verbatim from migrations 206 / 210) ──────────────────────
create table if not exists public.driver_onboarding (
  id               uuid primary key default gen_random_uuid(),
  driver_email     text not null unique,
  current_step     integer not null default 1,
  status           text not null default 'in_progress',
  personal_info    jsonb,
  employment_info  jsonb,
  started_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.onboarding_step_completion (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  driver_email    text not null,
  step_name       text not null,
  step_order      integer not null default 1,
  completed       boolean not null default false,
  completed_at    timestamptz,
  data            jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists onboarding_step_completion_email_idx on public.onboarding_step_completion(driver_email);
create index if not exists onboarding_step_completion_org_idx   on public.onboarding_step_completion(organization_id);

-- ── 2. RLS (project convention; safe if 206/210 already set these) ───────────
alter table if exists public.driver_onboarding          enable row level security;
alter table if exists public.onboarding_step_completion enable row level security;

drop policy if exists "auth_all_driver_onboarding" on public.driver_onboarding;
create policy "auth_all_driver_onboarding"
  on public.driver_onboarding for all using (auth.role() = 'authenticated');
drop policy if exists "auth_all_onboarding_step_completion" on public.onboarding_step_completion;
create policy "auth_all_onboarding_step_completion"
  on public.onboarding_step_completion for all using (auth.role() = 'authenticated');

-- ── 3. The two views (verbatim from migration 214) ──────────────────────────
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
