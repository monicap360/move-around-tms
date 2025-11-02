-- ==================================================
-- Migration: Enhanced weekly payroll with tax calculations
-- ==================================================

-- Drop old view
drop view if exists driver_weekly_payroll_summary;

-- Create comprehensive payroll summary view with tax calculations
create or replace view driver_weekly_payroll_summary as
select
  d.id as driver_id,
  d.name as driver_name,
  d.pay_type,
  d.tax_status,
  d.hourly_rate,
  d.ssn_last4,
  d.ein,
  
  -- Week period (Friday-based)
  (date_trunc('week', t.ticket_date)::date + interval '4 days')::date as week_end,
  (date_trunc('week', t.ticket_date)::date - interval '2 days')::date as week_start,
  
  -- Ticket counts and totals
  count(t.id) as tickets_count,
  sum(t.quantity) as total_quantity,
  string_agg(distinct t.unit_type, ', ') as unit_types_worked,
  
  -- Gross pay calculation
  sum(t.total_pay) as gross_pay,
  
  -- Tax withholdings (W2 only - estimated federal rates)
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * 0.12, 2)  -- Federal income tax (12% bracket estimate)
    else 0
  end as federal_tax_withheld,
  
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * 0.062, 2)  -- Social Security (6.2%)
    else 0
  end as social_security_withheld,
  
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * 0.0145, 2)  -- Medicare (1.45%)
    else 0
  end as medicare_withheld,
  
  -- Total withholdings
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * (0.12 + 0.062 + 0.0145), 2)
    else 0
  end as total_withholdings,
  
  -- Net pay
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * (1 - 0.12 - 0.062 - 0.0145), 2)
    when d.tax_status = '1099' then 
      sum(t.total_pay)  -- No withholdings for 1099
    else sum(t.total_pay)
  end as net_pay,
  
  -- Employer taxes (940/941 - for reporting only, not deducted from driver)
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * 0.062, 2)  -- Employer SS match (6.2%)
    else 0
  end as employer_social_security,
  
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * 0.0145, 2)  -- Employer Medicare match (1.45%)
    else 0
  end as employer_medicare,
  
  case 
    when d.tax_status = 'W2' then 
      round(sum(t.total_pay) * 0.006, 2)  -- FUTA (0.6% on first $7k/year)
    else 0
  end as employer_futa,
  
  -- Total employer cost
  case 
    when d.tax_status = 'W2' then 
      sum(t.total_pay) + round(sum(t.total_pay) * (0.062 + 0.0145 + 0.006), 2)
    else sum(t.total_pay)
  end as total_employer_cost,
  
  -- Revenue and profit
  sum(t.total_bill) as total_bill,
  sum(t.total_profit) as gross_profit,
  
  -- Profit after employer taxes
  case 
    when d.tax_status = 'W2' then 
      sum(t.total_profit) - round(sum(t.total_pay) * (0.062 + 0.0145 + 0.006), 2)
    else sum(t.total_profit)
  end as net_profit,
  
  -- Pay basis label
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
group by 
  d.id, 
  d.name, 
  d.pay_type, 
  d.tax_status, 
  d.hourly_rate,
  d.ssn_last4,
  d.ein,
  date_trunc('week', t.ticket_date)
order by week_end desc, driver_name;

comment on view driver_weekly_payroll_summary is 'Weekly payroll with W2/1099 tax calculations, withholdings, and employer costs (940/941)';
