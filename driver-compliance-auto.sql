-- ============================================================
-- Driver Compliance Auto-Enforcement
-- Run in Supabase SQL Editor
-- Monitors medical card, CDL, MVR expiration across driver_profiles
-- Auto-blocks dispatch, logs every change, queues notifications
-- ============================================================

-- 1. Notifications queue table
create table if not exists driver_compliance_notifications (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null,
  driver_name   text not null,
  document_type text not null,   -- 'medical_card' | 'cdl' | 'mvr'
  expired_on    date,
  expires_on    date,
  alert_type    text not null,   -- 'expired' | 'expiring_30' | 'expiring_14' | 'expiring_7'
  status        text not null default 'pending' check (status in ('pending','sent','dismissed')),
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_dcn_driver   on driver_compliance_notifications(driver_id, created_at desc);
create index if not exists idx_dcn_status   on driver_compliance_notifications(status);
create index if not exists idx_dcn_type     on driver_compliance_notifications(document_type, alert_type);


-- 2. Main compliance check function
--    Scans all driver_profiles, flags expired/expiring docs,
--    updates dispatch_eligible on drivers table, queues notifications.
--    Returns rows describing every action taken.
create or replace function run_driver_compliance_check()
returns table(
  driver_id     uuid,
  driver_name   text,
  document_type text,
  alert_type    text,
  expires_on    date,
  action_taken  text
)
language plpgsql security definer as $$
declare
  rec         record;
  v_today     date := current_date;
  v_blocked   boolean;
  v_alert     text;
  v_doc_type  text;
  v_exp_date  date;
begin
  for rec in
    select
      d.id                          as driver_id,
      coalesce(p.full_name, d.name) as driver_name,
      p.medical_card_expiration,
      p.license_expiration_date,
      p.mvr_expiration,
      d.status                      as driver_status
    from drivers d
    left join driver_profiles p on p.driver_id = d.id
    where d.status not in ('inactive','terminated')
  loop
    -- Check each document type
    for v_doc_type, v_exp_date in
      values
        ('medical_card', rec.medical_card_expiration),
        ('cdl',          rec.license_expiration_date),
        ('mvr',          rec.mvr_expiration)
    loop
      continue when v_exp_date is null;

      -- Determine alert type
      v_alert := case
        when v_exp_date < v_today              then 'expired'
        when v_exp_date <= v_today + 7         then 'expiring_7'
        when v_exp_date <= v_today + 14        then 'expiring_14'
        when v_exp_date <= v_today + 30        then 'expiring_30'
        else null
      end;

      continue when v_alert is null;

      -- Insert notification only if not already queued today
      insert into driver_compliance_notifications
        (driver_id, driver_name, document_type, expired_on, expires_on, alert_type)
      select
        rec.driver_id,
        rec.driver_name,
        v_doc_type,
        case when v_exp_date < v_today then v_exp_date end,
        v_exp_date,
        v_alert
      where not exists (
        select 1 from driver_compliance_notifications
        where driver_id    = rec.driver_id
          and document_type = v_doc_type
          and alert_type    = v_alert
          and created_at   >= v_today::timestamptz
      );

      -- Block dispatch if any document is expired
      if v_alert = 'expired' then
        update drivers
        set status = coalesce(nullif(status,'active'), status)
        where id = rec.driver_id;

        -- Update driver profile dispatch block flag if column exists
        update driver_profiles
        set dispatch_eligible = false
        where driver_id = rec.driver_id
          and exists (
            select 1 from information_schema.columns
            where table_name = 'driver_profiles' and column_name = 'dispatch_eligible'
          );

        return query select rec.driver_id, rec.driver_name, v_doc_type, v_alert, v_exp_date,
          'Dispatch eligibility blocked — ' || v_doc_type || ' expired ' || v_exp_date::text;
      else
        return query select rec.driver_id, rec.driver_name, v_doc_type, v_alert, v_exp_date,
          'Notification queued — ' || v_doc_type || ' expires in ' ||
          (v_exp_date - v_today)::text || ' days';
      end if;
    end loop;
  end loop;
end;
$$;


-- 3. Trigger: auto-block when medical card / CDL / MVR expiration date is updated
--    Fires whenever a driver_profiles row changes these date fields.
create or replace function trg_driver_profile_compliance()
returns trigger language plpgsql as $$
declare
  v_today     date := current_date;
  v_name      text;
  v_blocked   boolean := false;
  v_doc_type  text;
  v_exp_date  date;
begin
  select coalesce(full_name, name) into v_name
  from drivers where id = new.driver_id;

  for v_doc_type, v_exp_date in
    values
      ('medical_card', new.medical_card_expiration),
      ('cdl',          new.license_expiration_date),
      ('mvr',          new.mvr_expiration)
  loop
    continue when v_exp_date is null;
    if v_exp_date < v_today then
      v_blocked := true;
      insert into driver_compliance_notifications
        (driver_id, driver_name, document_type, expired_on, expires_on, alert_type)
      values
        (new.driver_id, coalesce(v_name,'Unknown'), v_doc_type, v_exp_date, v_exp_date, 'expired')
      on conflict do nothing;
    end if;
  end loop;

  if v_blocked then
    new.dispatch_eligible := false;
  end if;

  return new;
end;
$$;

-- Add dispatch_eligible to driver_profiles if missing
alter table driver_profiles
  add column if not exists dispatch_eligible boolean not null default true;

drop trigger if exists trg_compliance_on_profile_update on driver_profiles;
create trigger trg_compliance_on_profile_update
  before update of medical_card_expiration, license_expiration_date, mvr_expiration
  on driver_profiles
  for each row execute function trg_driver_profile_compliance();


-- 4. Schedule daily check with pg_cron (enable pg_cron extension first in Supabase dashboard)
-- Extensions → enable pg_cron, then run:
-- select cron.schedule('daily-compliance-check', '0 6 * * *', 'select run_driver_compliance_check()');
-- This runs every day at 6am UTC. Change hour to match your timezone.


-- 5. Quick query: see all pending alerts right now
-- select * from driver_compliance_notifications where status = 'pending' order by created_at desc;

-- 6. Run a manual check right now and see results
-- select * from run_driver_compliance_check();
