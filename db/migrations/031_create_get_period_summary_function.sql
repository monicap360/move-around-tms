-- Function: get_period_summary(text)
-- Purpose: Summarize payroll by month (YYYY-MM) per employee
-- Note: Uses range predicates for index-friendly filtering instead of to_char

create or replace function public.get_period_summary(p_period text)
returns table(
  employee_id uuid,
  total_gross numeric,
  total_net numeric
)
language sql
stable
as $$
  with bounds as (
    select
      to_date(p_period || '-01', 'YYYY-MM-DD') as period_start,
      (to_date(p_period || '-01', 'YYYY-MM-DD') + interval '1 month') as period_end
  )
  select
    pe.employee_id,
    sum(pe.gross_pay)::numeric as total_gross,
    sum(pe.net_pay)::numeric   as total_net
  from payroll_entries pe
  cross join bounds b
  where pe.pay_period_end >= b.period_start
    and pe.pay_period_end  < b.period_end
  group by pe.employee_id
  order by pe.employee_id;
$$;
