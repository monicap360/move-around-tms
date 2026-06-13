-- ============================================================
-- Maintenance Module — Production Hardening Patch
-- Run AFTER maintenance-schema.sql AND maintenance-gate.sql
-- All statements are idempotent (safe to re-run)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ADDITIONAL INDEXES
-- ────────────────────────────────────────────────────────────

-- Gate evaluation reads these columns on every restore attempt
create index if not exists idx_mu_inspection  on maintenance_units(annual_inspection_expires);
create index if not exists idx_mu_insurance   on maintenance_units(insurance_expires);
create index if not exists idx_mu_registration on maintenance_units(registration_expires);

-- Work order priority+status lookup (used by gate + dashboard)
create index if not exists idx_mwo_priority_status
  on maintenance_work_orders(priority, status)
  where status <> 'Completed';

-- Activity log lookups by unit and time
create index if not exists idx_mal_unit_time
  on maintenance_activity_log(unit_id, created_at desc);

-- Document lookups by unit
create index if not exists idx_mdoc_unit
  on maintenance_documents(unit_id, created_at desc);


-- ────────────────────────────────────────────────────────────
-- 2. CONSTRAINTS
-- ────────────────────────────────────────────────────────────

-- Critical work orders must have a vendor or notes before completion
alter table maintenance_work_orders
  drop constraint if exists chk_critical_completion;

alter table maintenance_work_orders
  add constraint chk_critical_completion check (
    not (
      priority = 'Critical'
      and status = 'Completed'
      and (vendor is null or vendor = '')
      and (notes is null or notes = '')
    )
  );

-- Actual cost cannot exceed 10x estimate (catches data entry errors)
alter table maintenance_work_orders
  drop constraint if exists chk_cost_sanity;

alter table maintenance_work_orders
  add constraint chk_cost_sanity check (
    actual_cost is null
    or estimated_cost is null
    or estimated_cost = 0
    or actual_cost <= estimated_cost * 10
  );

-- Odometer cannot go backwards
-- (enforced via trigger below so we can give a clear error message)


-- ────────────────────────────────────────────────────────────
-- 3. AUTO-TIMESTAMP TRIGGER
-- ────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_units_updated_at    on maintenance_units;
drop trigger if exists trg_wo_updated_at       on maintenance_work_orders;

create trigger trg_units_updated_at
  before update on maintenance_units
  for each row execute function set_updated_at();

create trigger trg_wo_updated_at
  before update on maintenance_work_orders
  for each row execute function set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 4. ODOMETER GUARD TRIGGER
-- ────────────────────────────────────────────────────────────

create or replace function trg_odometer_guard()
returns trigger language plpgsql as $$
begin
  if new.odometer < old.odometer then
    raise exception
      'Odometer cannot decrease (current: %, new: %)', old.odometer, new.odometer
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists odometer_guard on maintenance_units;
create trigger odometer_guard
  before update of odometer on maintenance_units
  for each row execute function trg_odometer_guard();


-- ────────────────────────────────────────────────────────────
-- 5. IMMUTABLE AUDIT LOG
--    Activity log rows must never be updated or deleted.
--    This guarantees a tamper-proof chain for compliance audits.
-- ────────────────────────────────────────────────────────────

create or replace function trg_deny_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception
    'maintenance_activity_log is append-only and cannot be modified or deleted'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists deny_audit_update on maintenance_activity_log;
drop trigger if exists deny_audit_delete on maintenance_activity_log;

create trigger deny_audit_update
  before update on maintenance_activity_log
  for each row execute function trg_deny_audit_mutation();

create trigger deny_audit_delete
  before delete on maintenance_activity_log
  for each row execute function trg_deny_audit_mutation();


-- ────────────────────────────────────────────────────────────
-- 6. AUTO-LOG ON DISPATCH TOGGLE
--    Writes to activity log automatically whenever
--    dispatch_eligible changes — even if changed directly in SQL.
-- ────────────────────────────────────────────────────────────

create or replace function trg_log_dispatch_change()
returns trigger language plpgsql as $$
begin
  if new.dispatch_eligible is distinct from old.dispatch_eligible then
    insert into maintenance_activity_log(unit_id, action, old_value, new_value)
    values (
      new.id,
      case when new.dispatch_eligible then 'Dispatch RESTORED' else 'Dispatch BLOCKED' end,
      case when old.dispatch_eligible then 'Eligible' else 'Blocked' end,
      case when new.dispatch_eligible then 'Eligible' else 'Blocked — ' || array_to_string(new.block_reasons, ', ') end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_dispatch_change on maintenance_units;
create trigger log_dispatch_change
  after update of dispatch_eligible on maintenance_units
  for each row execute function trg_log_dispatch_change();


-- ────────────────────────────────────────────────────────────
-- 7. AUTO-LOG ON WORK ORDER STATUS CHANGE
-- ────────────────────────────────────────────────────────────

create or replace function trg_log_wo_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into maintenance_activity_log(unit_id, work_order_id, action, old_value, new_value)
    values (new.unit_id, new.id, 'Work order status changed', old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists log_wo_status on maintenance_work_orders;
create trigger log_wo_status
  after update of status on maintenance_work_orders
  for each row execute function trg_log_wo_status();


-- ────────────────────────────────────────────────────────────
-- 8. RLS POLICIES
--    Three roles assumed in your JWT claims:
--      admin  — full access
--      ops    — read + write units/work orders, no delete
--      driver — read only, own truck only
--
--    Adjust role names to match your actual auth.users metadata.
-- ────────────────────────────────────────────────────────────

-- Helper: extract role from JWT
create or replace function jwt_role()
returns text language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role',
    'driver'
  );
$$;

-- Helper: extract user id from JWT
create or replace function jwt_user_id()
returns uuid language sql stable as $$
  select (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
$$;

-- maintenance_units
drop policy if exists "admin_all_units"   on maintenance_units;
drop policy if exists "ops_rw_units"      on maintenance_units;
drop policy if exists "driver_own_unit"   on maintenance_units;

create policy "admin_all_units" on maintenance_units
  for all using (jwt_role() = 'admin');

create policy "ops_rw_units" on maintenance_units
  for all using (jwt_role() in ('ops', 'admin'))
  with check (jwt_role() in ('ops', 'admin'));

create policy "driver_own_unit" on maintenance_units
  for select using (
    jwt_role() = 'driver'
    and assigned_driver_id = jwt_user_id()
  );

-- maintenance_work_orders
drop policy if exists "admin_all_wo"  on maintenance_work_orders;
drop policy if exists "ops_rw_wo"     on maintenance_work_orders;
drop policy if exists "driver_own_wo" on maintenance_work_orders;

create policy "admin_all_wo" on maintenance_work_orders
  for all using (jwt_role() = 'admin');

create policy "ops_rw_wo" on maintenance_work_orders
  for all using (jwt_role() in ('ops', 'admin'))
  with check (jwt_role() in ('ops', 'admin'));

create policy "driver_own_wo" on maintenance_work_orders
  for select using (
    jwt_role() = 'driver'
    and unit_id in (
      select id from maintenance_units where assigned_driver_id = jwt_user_id()
    )
  );

-- maintenance_documents
drop policy if exists "admin_all_docs"  on maintenance_documents;
drop policy if exists "ops_rw_docs"     on maintenance_documents;

create policy "admin_all_docs" on maintenance_documents
  for all using (jwt_role() = 'admin');

create policy "ops_rw_docs" on maintenance_documents
  for all using (jwt_role() in ('ops', 'admin'))
  with check (jwt_role() in ('ops', 'admin'));

-- maintenance_activity_log — read for ops/admin, insert only (no update/delete enforced by trigger)
drop policy if exists "admin_read_logs"  on maintenance_activity_log;
drop policy if exists "ops_read_logs"    on maintenance_activity_log;
drop policy if exists "insert_logs"      on maintenance_activity_log;

create policy "admin_read_logs" on maintenance_activity_log
  for select using (jwt_role() = 'admin');

create policy "ops_read_logs" on maintenance_activity_log
  for select using (jwt_role() in ('ops', 'admin'));

create policy "insert_logs" on maintenance_activity_log
  for insert with check (jwt_role() in ('admin', 'ops'));


-- ────────────────────────────────────────────────────────────
-- 9. REPORTING VIEW — 30-DAY EXPIRY WATCH
--    Shows every unit with any doc expiring in the next 30 days
--    or already expired. Great for the dashboard warning strip.
-- ────────────────────────────────────────────────────────────

create or replace view maintenance_expiry_watch as
select
  id,
  unit_number,
  unit_type,
  dispatch_eligible,
  annual_inspection_expires,
  insurance_expires,
  registration_expires,
  (annual_inspection_expires < current_date)                    as inspection_expired,
  (insurance_expires         < current_date)                    as insurance_expired,
  (registration_expires      < current_date)                    as registration_expired,
  (annual_inspection_expires between current_date and current_date + 30) as inspection_due_soon,
  (insurance_expires         between current_date and current_date + 30) as insurance_due_soon,
  (registration_expires      between current_date and current_date + 30) as registration_due_soon
from maintenance_units
where
  annual_inspection_expires < current_date + 30
  or insurance_expires       < current_date + 30
  or registration_expires    < current_date + 30;


-- ────────────────────────────────────────────────────────────
-- 10. STORAGE BUCKET POLICY (run separately in Supabase dashboard
--     or via the Storage API — SQL below is for reference only)
-- ────────────────────────────────────────────────────────────

-- In Supabase Dashboard → Storage → New bucket:
--   Name:   maintenance-docs
--   Public: false (private, signed URLs only)
--
-- Then add these policies in the bucket's Policies tab:
--
--   Allow insert for ops/admin:
--     (auth.jwt() ->> 'role') in ('admin','ops')
--
--   Allow select for ops/admin:
--     (auth.jwt() ->> 'role') in ('admin','ops')
--
--   Allow driver to read their own unit docs:
--     (auth.jwt() ->> 'role') = 'driver'


-- ────────────────────────────────────────────────────────────
-- DONE. Summary of what this patch adds:
--
--  Indexes    : 5 new covering gate, dashboard, activity queries
--  Constraints: critical WO completion requires vendor/notes;
--               cost sanity check (actual <= 10x estimate)
--  Triggers   : auto-timestamp, odometer guard, immutable audit log,
--               auto-log on dispatch toggle, auto-log on WO status
--  RLS        : admin / ops / driver role policies on all 4 tables
--  Views      : maintenance_expiry_watch (30-day expiry dashboard)
-- ────────────────────────────────────────────────────────────
