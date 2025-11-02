-- Align get_period_summary with requested definition using to_char month filter

create or replace function get_period_summary(p_period text)
returns table(employee_id uuid, total_gross numeric, total_net numeric)
language sql as $$
  select employee_id,
         sum(gross_pay) as total_gross,
         sum(net_pay)   as total_net
  from payroll_entries
  where to_char(pay_period_end, 'YYYY-MM') = p_period
  group by employee_id;
$$;
