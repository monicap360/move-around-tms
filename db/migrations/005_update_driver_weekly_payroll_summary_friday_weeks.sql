-- ==================================================
-- Update View: driver_weekly_payroll_summary (Friday pay periods)
-- Weeks end on Friday; weeks start on Saturday.
-- ==================================================
create or replace view driver_weekly_payroll_summary as
select
  d.id as driver_id,
  d.name as driver_name,
  d.pay_type,
  -- Week ends on Friday
  (
    (t.ticket_date::date)
    + (mod(5 - cast(extract(isodow from t.ticket_date) as int) + 7, 7)) * interval '1 day'
  )::date as week_end,
  -- Week starts on Saturday (6 days before Friday)
  (
    (
      (t.ticket_date::date)
      + (mod(5 - cast(extract(isodow from t.ticket_date) as int) + 7, 7)) * interval '1 day'
    )::date - interval '6 days'
  )::date as week_start,
  sum(t.total_pay) as total_pay,
  sum(t.total_bill) as total_bill,
  sum(t.total_profit) as total_profit,
  count(t.id) as tickets_count,
  string_agg(distinct t.unit_type, ', ') as unit_types_worked,
  case
    when d.pay_type = 'Hour' then 'Hourly'
    when d.pay_type = 'Yard' then 'Per Yard'
    when d.pay_type = 'Ton' then 'Per Ton'
    when d.pay_type = 'Load' then 'Per Load'
    else 'Percentage'
  end as pay_basis
from public.aggregate_tickets t
left join public.drivers d on t.driver_id = d.id
where t.status in ('Approved','Pending','Completed')
group by d.id, d.name, d.pay_type,
  (
    (t.ticket_date::date)
    + (mod(5 - cast(extract(isodow from t.ticket_date) as int) + 7, 7)) * interval '1 day'
  )::date,
  (
    (
      (t.ticket_date::date)
      + (mod(5 - cast(extract(isodow from t.ticket_date) as int) + 7, 7)) * interval '1 day'
    )::date - interval '6 days'
  )::date
order by week_end desc, driver_name;
