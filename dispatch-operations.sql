-- ============================================================
-- Dispatch Operations Layer
-- Run in Supabase SQL Editor after dispatch-schema.sql
-- ============================================================

-- 1. dispatch_overrides — logged manager overrides for soft blocks
create table if not exists dispatch_overrides (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references dispatch_jobs(id) on delete cascade,
  driver_id       uuid references drivers(id) on delete set null,
  rule_overridden text not null,   -- e.g. 'payment_unpaid' | 'missing_phone' | 'special_instructions'
  reason          text not null,
  manager_name    text not null,
  approved        boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_do_job    on dispatch_overrides(job_id, created_at desc);
create index if not exists idx_do_driver on dispatch_overrides(driver_id, created_at desc);

-- Immutable
create or replace function deny_override_change()
returns trigger language plpgsql as $$
begin raise exception 'Dispatch overrides are immutable audit records.'; end;
$$;
drop trigger if exists no_update_overrides on dispatch_overrides;
create trigger no_update_overrides before update on dispatch_overrides for each row execute function deny_override_change();
drop trigger if exists no_delete_overrides on dispatch_overrides;
create trigger no_delete_overrides before delete on dispatch_overrides for each row execute function deny_override_change();


-- 2. dispatch_incidents — operational issues per trip
create table if not exists dispatch_incidents (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references dispatch_jobs(id) on delete set null,
  driver_id       uuid references drivers(id) on delete set null,
  incident_type   text not null check (incident_type in (
    'customer_no_show','driver_late','vehicle_issue','wrong_address',
    'payment_issue','passenger_complaint','damage_report','accident',
    'weather_delay','cruise_delay','airport_delay','other'
  )),
  description     text,
  severity        text not null default 'medium'
                    check (severity in ('low','medium','high','critical')),
  is_resolved     boolean not null default false,
  resolved_by     text,
  resolved_at     timestamptz,
  created_by      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_di_job      on dispatch_incidents(job_id, created_at desc);
create index if not exists idx_di_resolved on dispatch_incidents(is_resolved, severity);


-- 3. dispatch_notes — categorized notes per trip
create table if not exists dispatch_notes (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references dispatch_jobs(id) on delete cascade,
  category    text not null default 'internal'
                check (category in ('customer','driver','manager','payment','delay','complaint','internal')),
  body        text not null,
  created_by  text not null default 'dispatch',
  created_at  timestamptz not null default now()
);

create index if not exists idx_dn_job on dispatch_notes(job_id, created_at desc);


-- 4. Add acceptance_status to dispatch_assignments (if not present)
alter table dispatch_assignments
  add column if not exists acceptance_status text default 'sent'
    check (acceptance_status in ('sent','accepted','declined','no_response')),
  add column if not exists sent_at           timestamptz,
  add column if not exists no_response_at    timestamptz;


-- 5. RLS
alter table dispatch_overrides enable row level security;
alter table dispatch_incidents  enable row level security;
alter table dispatch_notes      enable row level security;

create policy "do_service" on dispatch_overrides for all to service_role using (true) with check (true);
create policy "do_auth"    on dispatch_overrides for select to authenticated using (true);
create policy "di_service" on dispatch_incidents for all to service_role using (true) with check (true);
create policy "di_auth"    on dispatch_incidents for select to authenticated using (true);
create policy "dn_service" on dispatch_notes for all to service_role using (true) with check (true);
create policy "dn_auth"    on dispatch_notes for select to authenticated using (true);


-- 6. Verify
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('dispatch_overrides','dispatch_incidents','dispatch_notes')
order by table_name;
