-- ============================================================
-- Maintenance Safety Gate — Supabase SQL
-- Run in Supabase SQL Editor AFTER maintenance-schema.sql
-- ============================================================

-- 1. Add block_reason column to maintenance_units
alter table maintenance_units
  add column if not exists block_reasons text[] not null default '{}';

-- 2. Function: evaluate dispatch gate for a unit
--    Returns: (eligible bool, reasons text[])
create or replace function check_dispatch_gate(p_unit_id uuid)
returns table(eligible boolean, reasons text[])
language plpgsql security definer as $$
declare
  v_unit    maintenance_units%rowtype;
  v_reasons text[] := '{}';
  v_today   date   := current_date;
  v_critical_count int;
begin
  select * into v_unit from maintenance_units where id = p_unit_id;
  if not found then
    return query select false, array['Unit not found']::text[];
    return;
  end if;

  if v_unit.annual_inspection_expires is not null and v_unit.annual_inspection_expires < v_today then
    v_reasons := v_reasons || ('Annual inspection expired ' || v_unit.annual_inspection_expires::text);
  end if;

  if v_unit.insurance_expires is not null and v_unit.insurance_expires < v_today then
    v_reasons := v_reasons || ('Insurance expired ' || v_unit.insurance_expires::text);
  end if;

  if v_unit.registration_expires is not null and v_unit.registration_expires < v_today then
    v_reasons := v_reasons || ('Registration expired ' || v_unit.registration_expires::text);
  end if;

  select count(*) into v_critical_count
  from maintenance_work_orders
  where unit_id = p_unit_id
    and priority = 'Critical'
    and status not in ('Completed');

  if v_critical_count > 0 then
    v_reasons := v_reasons || (v_critical_count::text || ' open critical work order(s)');
  end if;

  return query select (array_length(v_reasons, 1) is null), v_reasons;
end;
$$;

-- 3. Function: block_unit_dispatch — sets blocked + logs
create or replace function block_unit_dispatch(p_unit_id uuid, p_actor_id uuid default null, p_reason text default 'Manual block')
returns void
language plpgsql security definer as $$
begin
  update maintenance_units
  set dispatch_eligible = false,
      status = 'Out of Service',
      updated_at = now()
  where id = p_unit_id;

  insert into maintenance_activity_log(unit_id, action, old_value, new_value, created_by)
  values (p_unit_id, 'Dispatch BLOCKED', 'Eligible', 'Blocked — ' || p_reason, p_actor_id);
end;
$$;

-- 4. Function: restore_unit_dispatch — gate checks first, then restores
create or replace function restore_unit_dispatch(p_unit_id uuid, p_actor_id uuid default null)
returns table(success boolean, reasons text[])
language plpgsql security definer as $$
declare
  v_eligible boolean;
  v_reasons  text[];
begin
  select g.eligible, g.reasons
  into v_eligible, v_reasons
  from check_dispatch_gate(p_unit_id) g;

  if not v_eligible then
    -- Update block_reasons so UI shows why
    update maintenance_units set block_reasons = v_reasons where id = p_unit_id;
    return query select false, v_reasons;
    return;
  end if;

  update maintenance_units
  set dispatch_eligible = true,
      status = 'Ready',
      block_reasons = '{}',
      updated_at = now()
  where id = p_unit_id;

  insert into maintenance_activity_log(unit_id, action, old_value, new_value, created_by)
  values (p_unit_id, 'Dispatch RESTORED', 'Blocked', 'Eligible', p_actor_id);

  return query select true, '{}'::text[];
end;
$$;

-- 5. Function: mark_unit_reviewed — updates status + logs
create or replace function mark_unit_reviewed(p_unit_id uuid, p_actor_id uuid default null)
returns void
language plpgsql security definer as $$
declare
  v_old_status text;
  v_new_status text;
begin
  select status into v_old_status from maintenance_units where id = p_unit_id;
  v_new_status := case when v_old_status = 'Overdue' then 'Due Soon' else v_old_status end;

  update maintenance_units
  set status = v_new_status,
      updated_at = now()
  where id = p_unit_id;

  insert into maintenance_activity_log(unit_id, action, old_value, new_value, created_by)
  values (p_unit_id, 'Marked reviewed', v_old_status, v_new_status, p_actor_id);
end;
$$;

-- 6. Trigger: auto-evaluate gate whenever dates change on a unit
create or replace function trg_auto_check_gate()
returns trigger language plpgsql as $$
declare
  v_eligible boolean;
  v_reasons  text[];
begin
  -- Only re-evaluate if a date column changed
  if (
    new.annual_inspection_expires is distinct from old.annual_inspection_expires or
    new.insurance_expires         is distinct from old.insurance_expires         or
    new.registration_expires      is distinct from old.registration_expires
  ) then
    select g.eligible, g.reasons
    into v_eligible, v_reasons
    from check_dispatch_gate(new.id) g;

    new.dispatch_eligible := v_eligible;
    new.block_reasons     := v_reasons;
    if not v_eligible then
      new.status := 'Out of Service';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists auto_gate_check on maintenance_units;
create trigger auto_gate_check
  before update on maintenance_units
  for each row execute function trg_auto_check_gate();

-- 7. RLS policies (adjust role names to match your auth setup)
alter table maintenance_units          enable row level security;
alter table maintenance_work_orders    enable row level security;
alter table maintenance_documents      enable row level security;
alter table maintenance_activity_log   enable row level security;

-- Service role can do everything (used by server-side API routes)
create policy "service_role_all_units"       on maintenance_units        for all using (true);
create policy "service_role_all_work_orders" on maintenance_work_orders  for all using (true);
create policy "service_role_all_documents"   on maintenance_documents    for all using (true);
create policy "service_role_all_activity"    on maintenance_activity_log for all using (true);
