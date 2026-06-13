-- ============================================================
-- Driver Compliance Audit Columns + Audit Log Table
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add dispatch block metadata columns to driver_profiles
alter table driver_profiles
  add column if not exists dispatch_block_reason  text,
  add column if not exists dispatch_blocked_at    timestamptz,
  add column if not exists dispatch_blocked_by    text;

-- payroll_eligible may not exist yet either
alter table driver_profiles
  add column if not exists payroll_eligible    boolean not null default true,
  add column if not exists compliance_status   text,
  add column if not exists last_audit_date     timestamptz;


-- 2. Compliance audit log table
--    Immutable append-only — one row per action taken on a driver.
create table if not exists driver_compliance_audit_log (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null,
  driver_name   text,
  action        text not null,   -- e.g. 'dispatch_blocked' | 'dispatch_restored' | 'reminder_sent' | 'doc_reviewed'
  reason        text,            -- e.g. 'Medical card expired'
  performed_by  text,            -- admin user email or id
  metadata      jsonb,           -- any extra context (document type, expiry date, etc.)
  created_at    timestamptz not null default now()
);

create index if not exists idx_dcal_driver on driver_compliance_audit_log(driver_id, created_at desc);
create index if not exists idx_dcal_action on driver_compliance_audit_log(action, created_at desc);

-- Prevent anyone from updating or deleting audit rows
create or replace function deny_compliance_audit_change()
returns trigger language plpgsql as $$
begin
  raise exception 'Compliance audit log is immutable — rows cannot be updated or deleted.';
end;
$$;

drop trigger if exists no_update_compliance_audit on driver_compliance_audit_log;
create trigger no_update_compliance_audit
  before update on driver_compliance_audit_log
  for each row execute function deny_compliance_audit_change();

drop trigger if exists no_delete_compliance_audit on driver_compliance_audit_log;
create trigger no_delete_compliance_audit
  before delete on driver_compliance_audit_log
  for each row execute function deny_compliance_audit_change();


-- 3. RLS: service role (server) can insert/select; no direct client writes
alter table driver_compliance_audit_log enable row level security;

drop policy if exists "audit_log_service_select" on driver_compliance_audit_log;
create policy "audit_log_service_select"
  on driver_compliance_audit_log for select
  to authenticated
  using (true);

-- Only service role can insert (API routes use service key)
drop policy if exists "audit_log_service_insert" on driver_compliance_audit_log;
create policy "audit_log_service_insert"
  on driver_compliance_audit_log for insert
  to service_role
  with check (true);


-- 4. Verify
select column_name, data_type
from information_schema.columns
where table_name = 'driver_profiles'
  and column_name in (
    'dispatch_eligible','dispatch_block_reason','dispatch_blocked_at','dispatch_blocked_by',
    'payroll_eligible','compliance_status','last_audit_date'
  )
order by column_name;

select 'driver_compliance_audit_log exists' as check_result
where exists (
  select 1 from information_schema.tables
  where table_name = 'driver_compliance_audit_log'
);
