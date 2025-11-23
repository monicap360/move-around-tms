-- ==================================================
-- View: driver_weekly_payroll_summary
-- Auto-calculates weekly totals per driver
-- ==================================================
create or replace view driver_weekly_payroll_summary as
select
  d.id as driver_id,
  d.name as driver_name,
  d.pay_type,
  date_trunc('week', t.ticket_date) as week_start,
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
group by d.id, d.name, d.pay_type, date_trunc('week', t.ticket_date)
order by week_start desc, driver_name;
