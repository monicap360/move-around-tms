-- ============================================================
-- Dispatch System Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. dispatch_jobs — canonical job/trip table
create table if not exists dispatch_jobs (
  id                    uuid primary key default gen_random_uuid(),
  job_number            text unique not null default 'J-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4),
  customer_name         text not null,
  customer_phone        text,
  customer_email        text,
  pickup_address        text,
  pickup_lat            numeric,
  pickup_lng            numeric,
  pickup_time           timestamptz,
  dropoff_address       text,
  dropoff_lat           numeric,
  dropoff_lng           numeric,
  dropoff_time          timestamptz,
  passenger_count       int default 1,
  luggage_count         int default 0,
  special_instructions  text,
  payment_status        text not null default 'unpaid'
                          check (payment_status in ('unpaid','partial','paid','refunded')),
  job_status            text not null default 'needs_review'
                          check (job_status in (
                            'needs_review','ready_to_dispatch','assigned',
                            'driver_accepted','en_route_pickup','arrived_pickup',
                            'loaded','en_route_dropoff','arrived_dropoff',
                            'completed','billing_review','cancelled'
                          )),
  risk_level            text not null default 'low'
                          check (risk_level in ('low','medium','high','critical')),
  assigned_driver_id    uuid references drivers(id) on delete set null,
  assigned_vehicle_id   uuid,
  special_instructions_ack boolean default false,
  missing_bol           boolean default false,
  proof_of_delivery_url text,
  created_by            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_dj_status      on dispatch_jobs(job_status, pickup_time);
create index if not exists idx_dj_driver      on dispatch_jobs(assigned_driver_id, job_status);
create index if not exists idx_dj_pickup_time on dispatch_jobs(pickup_time);
create index if not exists idx_dj_payment     on dispatch_jobs(payment_status, job_status);

-- Auto-update updated_at
create or replace function set_dispatch_job_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_dj_updated on dispatch_jobs;
create trigger trg_dj_updated
  before update on dispatch_jobs
  for each row execute function set_dispatch_job_updated();


-- 2. dispatch_assignments — one row per driver+job pairing
create table if not exists dispatch_assignments (
  id                    uuid primary key default gen_random_uuid(),
  job_id                uuid not null references dispatch_jobs(id) on delete cascade,
  driver_id             uuid not null references drivers(id) on delete cascade,
  vehicle_id            uuid,
  assigned_by           text,
  assigned_at           timestamptz not null default now(),
  driver_response       text check (driver_response in ('pending','accepted','declined')) default 'pending',
  driver_response_at    timestamptz,
  started_at            timestamptz,
  arrived_pickup_at     timestamptz,
  loaded_at             timestamptz,
  arrived_dropoff_at    timestamptz,
  completed_at          timestamptz,
  unique(job_id, driver_id)
);

create index if not exists idx_da_job    on dispatch_assignments(job_id);
create index if not exists idx_da_driver on dispatch_assignments(driver_id, assigned_at desc);


-- 3. dispatch_alerts — flagged issues on jobs, drivers, or vehicles
create table if not exists dispatch_alerts (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references dispatch_jobs(id) on delete cascade,
  driver_id    uuid references drivers(id) on delete set null,
  vehicle_id   uuid,
  alert_type   text not null,
  severity     text not null check (severity in ('warning','high','critical','blocked')),
  message      text not null,
  is_resolved  boolean not null default false,
  resolved_by  text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_dalert_resolved on dispatch_alerts(is_resolved, severity);
create index if not exists idx_dalert_job      on dispatch_alerts(job_id);


-- 4. trip_status_history — immutable audit trail
create table if not exists trip_status_history (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references dispatch_jobs(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  changed_by   text,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_tsh_job on trip_status_history(job_id, created_at desc);

-- Prevent updates/deletes on history
create or replace function deny_trip_history_change()
returns trigger language plpgsql as $$
begin raise exception 'Trip status history is immutable.'; end;
$$;
drop trigger if exists no_update_tsh on trip_status_history;
create trigger no_update_tsh before update on trip_status_history for each row execute function deny_trip_history_change();
drop trigger if exists no_delete_tsh on trip_status_history;
create trigger no_delete_tsh before delete on trip_status_history for each row execute function deny_trip_history_change();


-- 5. Basic RLS (adjust roles to match your JWT setup)
alter table dispatch_jobs       enable row level security;
alter table dispatch_assignments enable row level security;
alter table dispatch_alerts      enable row level security;
alter table trip_status_history  enable row level security;

drop policy if exists "dj_service_all"  on dispatch_jobs;
create policy "dj_service_all" on dispatch_jobs for all to service_role using (true) with check (true);
drop policy if exists "dj_auth_read"    on dispatch_jobs;
create policy "dj_auth_read"   on dispatch_jobs for select to authenticated using (true);

drop policy if exists "da_service_all"  on dispatch_assignments;
create policy "da_service_all" on dispatch_assignments for all to service_role using (true) with check (true);
drop policy if exists "da_auth_read"    on dispatch_assignments;
create policy "da_auth_read"   on dispatch_assignments for select to authenticated using (true);

drop policy if exists "dalert_service_all" on dispatch_alerts;
create policy "dalert_service_all" on dispatch_alerts for all to service_role using (true) with check (true);
drop policy if exists "dalert_auth_read"   on dispatch_alerts;
create policy "dalert_auth_read"   on dispatch_alerts for select to authenticated using (true);

drop policy if exists "tsh_service_all" on trip_status_history;
create policy "tsh_service_all" on trip_status_history for all to service_role using (true) with check (true);
drop policy if exists "tsh_auth_read"   on trip_status_history;
create policy "tsh_auth_read"   on trip_status_history for select to authenticated using (true);


-- 6. Verify
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('dispatch_jobs','dispatch_assignments','dispatch_alerts','trip_status_history')
order by table_name;
