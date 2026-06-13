-- ============================================================
-- Maintenance Control Center — Sign-off Validation Script
-- Run in Supabase SQL Editor after all 3 migration files.
-- Each block is independent — run one at a time or all at once.
-- Expected result is shown in the comment above each check.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- CHECK 1: Safety gate blocks unit with expired inspection
-- Expected: eligible=false, reasons contains 'Annual inspection expired'
-- ────────────────────────────────────────────────────────────
do $$
declare
  v_id      uuid;
  v_elig    boolean;
  v_reasons text[];
begin
  -- Create a test unit with expired inspection
  insert into maintenance_units(unit_number, unit_type, annual_inspection_expires)
  values ('TEST-GATE-1', 'Truck', current_date - 1)
  returning id into v_id;

  select eligible, reasons
  into v_elig, v_reasons
  from check_dispatch_gate(v_id);

  assert v_elig = false,
    'FAIL: Unit with expired inspection should not be eligible';
  assert v_reasons[1] ilike '%Annual inspection expired%',
    'FAIL: Block reason should mention annual inspection. Got: ' || v_reasons[1];

  raise notice 'CHECK 1 PASSED — Gate blocks expired inspection. Reasons: %', v_reasons;

  -- Cleanup
  delete from maintenance_units where id = v_id;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- CHECK 2: Safety gate blocks unit with open critical work order
-- Expected: eligible=false, reasons contains 'open critical work order'
-- ────────────────────────────────────────────────────────────
do $$
declare
  v_unit_id uuid;
  v_wo_id   uuid;
  v_elig    boolean;
  v_reasons text[];
begin
  insert into maintenance_units(unit_number, unit_type)
  values ('TEST-GATE-2', 'Truck')
  returning id into v_unit_id;

  insert into maintenance_work_orders(unit_id, issue, priority, status)
  values (v_unit_id, 'Engine failure', 'Critical', 'Open')
  returning id into v_wo_id;

  select eligible, reasons
  into v_elig, v_reasons
  from check_dispatch_gate(v_unit_id);

  assert v_elig = false,
    'FAIL: Unit with open critical WO should not be eligible';
  assert v_reasons[1] ilike '%critical work order%',
    'FAIL: Block reason should mention critical work order. Got: ' || v_reasons[1];

  raise notice 'CHECK 2 PASSED — Gate blocks open critical work order. Reasons: %', v_reasons;

  delete from maintenance_work_orders where id = v_wo_id;
  delete from maintenance_units where id = v_unit_id;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- CHECK 3: restore_unit_dispatch refuses blocked unit, updates block_reasons
-- Expected: success=false, unit.block_reasons populated
-- ────────────────────────────────────────────────────────────
do $$
declare
  v_id      uuid;
  v_success boolean;
  v_reasons text[];
  v_stored  text[];
begin
  insert into maintenance_units(unit_number, unit_type, insurance_expires, dispatch_eligible)
  values ('TEST-RESTORE-1', 'Truck', current_date - 5, false)
  returning id into v_id;

  select success, reasons
  into v_success, v_reasons
  from restore_unit_dispatch(v_id);

  assert v_success = false,
    'FAIL: Restore should be refused for expired insurance';

  select block_reasons into v_stored
  from maintenance_units where id = v_id;

  assert array_length(v_stored, 1) > 0,
    'FAIL: block_reasons should be populated on the unit after failed restore';

  raise notice 'CHECK 3 PASSED — Restore refused, block_reasons stored: %', v_stored;

  delete from maintenance_units where id = v_id;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- CHECK 4: Block/Restore writes to activity log via trigger
-- Expected: 2 rows in maintenance_activity_log for the unit
-- ────────────────────────────────────────────────────────────
do $$
declare
  v_id    uuid;
  v_count int;
begin
  insert into maintenance_units(unit_number, unit_type, dispatch_eligible)
  values ('TEST-TRIGGER-1', 'Truck', true)
  returning id into v_id;

  -- Block (trigger should fire)
  update maintenance_units
  set dispatch_eligible = false, status = 'Out of Service'
  where id = v_id;

  -- Restore directly (trigger should fire again)
  update maintenance_units
  set dispatch_eligible = true, status = 'Ready'
  where id = v_id;

  select count(*) into v_count
  from maintenance_activity_log
  where unit_id = v_id
    and action in ('Dispatch BLOCKED', 'Dispatch RESTORED');

  assert v_count = 2,
    'FAIL: Expected 2 activity log entries, got ' || v_count;

  raise notice 'CHECK 4 PASSED — Block/Restore trigger wrote % activity log entries', v_count;

  delete from maintenance_activity_log where unit_id = v_id;
  delete from maintenance_units where id = v_id;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- CHECK 5: Activity log is append-only (UPDATE rejected)
-- Expected: exception raised, message contains 'append-only'
-- ────────────────────────────────────────────────────────────
do $$
declare
  v_id     uuid;
  v_log_id uuid;
  v_caught boolean := false;
begin
  insert into maintenance_units(unit_number, unit_type)
  values ('TEST-AUDIT-1', 'Truck')
  returning id into v_id;

  insert into maintenance_activity_log(unit_id, action, new_value)
  values (v_id, 'Test action', 'test')
  returning id into v_log_id;

  begin
    update maintenance_activity_log set action = 'Tampered' where id = v_log_id;
  exception when others then
    v_caught := true;
    raise notice 'CHECK 5 PASSED — Audit log UPDATE correctly rejected: %', sqlerrm;
  end;

  assert v_caught = true,
    'FAIL: UPDATE on maintenance_activity_log should have been rejected';

  -- Also test DELETE
  v_caught := false;
  begin
    delete from maintenance_activity_log where id = v_log_id;
  exception when others then
    v_caught := true;
    raise notice 'CHECK 5b PASSED — Audit log DELETE correctly rejected: %', sqlerrm;
  end;

  assert v_caught = true,
    'FAIL: DELETE on maintenance_activity_log should have been rejected';

  -- Cleanup (service role can still delete in cleanup via bypass)
  delete from maintenance_activity_log where id = v_log_id;
  delete from maintenance_units where id = v_id;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- CHECK 6: Odometer guard rejects decreasing mileage
-- Expected: exception raised
-- ────────────────────────────────────────────────────────────
do $$
declare
  v_id    uuid;
  v_caught boolean := false;
begin
  insert into maintenance_units(unit_number, unit_type, odometer)
  values ('TEST-ODO-1', 'Truck', 50000)
  returning id into v_id;

  begin
    update maintenance_units set odometer = 40000 where id = v_id;
  exception when check_violation then
    v_caught := true;
    raise notice 'CHECK 6 PASSED — Odometer decrease correctly rejected';
  end;

  assert v_caught = true,
    'FAIL: Decreasing odometer should have been rejected';

  delete from maintenance_units where id = v_id;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- CHECK 7: All required tables and views exist
-- Expected: 6 rows returned
-- ────────────────────────────────────────────────────────────
select
  table_name,
  table_type,
  case when table_name in (
    'maintenance_units',
    'maintenance_work_orders',
    'maintenance_documents',
    'maintenance_activity_log',
    'maintenance_dashboard_summary',
    'maintenance_expiry_watch'
  ) then 'EXPECTED' else 'UNEXPECTED' end as status
from information_schema.tables
where table_schema = 'public'
  and table_name like 'maintenance_%'
order by table_name;
-- Expected: 6 rows, all showing EXPECTED


-- ────────────────────────────────────────────────────────────
-- CHECK 8: All required indexes exist
-- Expected: 7+ rows returned
-- ────────────────────────────────────────────────────────────
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename like 'maintenance_%'
order by tablename, indexname;


-- ────────────────────────────────────────────────────────────
-- CHECK 9: All triggers exist on expected tables
-- Expected: at least 7 trigger rows
-- ────────────────────────────────────────────────────────────
select trigger_name, event_object_table, event_manipulation, action_timing
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table like 'maintenance_%'
order by event_object_table, trigger_name;


-- ────────────────────────────────────────────────────────────
-- CHECK 10: RLS is enabled on all 4 tables
-- Expected: 4 rows, all rowsecurity = true
-- ────────────────────────────────────────────────────────────
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in (
  'maintenance_units',
  'maintenance_work_orders',
  'maintenance_documents',
  'maintenance_activity_log'
)
order by relname;


-- ────────────────────────────────────────────────────────────
-- SUMMARY DASHBOARD (run last — shows live state)
-- ────────────────────────────────────────────────────────────
select
  (select count(*) from maintenance_units)                                            as total_units,
  (select count(*) from maintenance_units where dispatch_eligible = false)            as dispatch_blocked,
  (select count(*) from maintenance_units where status in ('Overdue','Out of Service')) as overdue_or_oos,
  (select count(*) from maintenance_work_orders where status <> 'Completed')          as open_work_orders,
  (select count(*) from maintenance_activity_log)                                     as total_audit_rows,
  (select count(*) from maintenance_documents)                                        as total_documents;
