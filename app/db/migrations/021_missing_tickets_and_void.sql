-- Add fields for missing ticket workflow and CSV reconciliation
ALTER TABLE public.aggregate_tickets
ADD COLUMN IF NOT EXISTS is_missing_ticket BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS missing_ticket_reason TEXT,
ADD COLUMN IF NOT EXISTS target_week_start DATE,
ADD COLUMN IF NOT EXISTS target_week_end DATE,
ADD COLUMN IF NOT EXISTS csv_reconciled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS csv_match_details JSONB,
ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create index for missing tickets filtering
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_missing 
ON public.aggregate_tickets(is_missing_ticket, status) 
WHERE is_missing_ticket = TRUE;

-- Create index for CSV reconciliation
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_csv_reconciled 
ON public.aggregate_tickets(csv_reconciled);

-- Create index for voided tickets
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_voided 
ON public.aggregate_tickets(voided) 
WHERE voided = TRUE;

-- Add comments
COMMENT ON COLUMN public.aggregate_tickets.is_missing_ticket IS 'True if ticket was submitted after pay week ended';
COMMENT ON COLUMN public.aggregate_tickets.missing_ticket_reason IS 'Driver explanation for why ticket was missing';
COMMENT ON COLUMN public.aggregate_tickets.target_week_start IS 'Which pay week this missing ticket should be applied to';
COMMENT ON COLUMN public.aggregate_tickets.target_week_end IS 'End of target pay week';
COMMENT ON COLUMN public.aggregate_tickets.csv_reconciled IS 'True if ticket matches material plant CSV records';
COMMENT ON COLUMN public.aggregate_tickets.csv_match_details IS 'Details of CSV reconciliation (ticket number, quantity match, etc.)';
COMMENT ON COLUMN public.aggregate_tickets.voided IS 'True if ticket is voided (exists but driver receives $0 pay)';
COMMENT ON COLUMN public.aggregate_tickets.voided_at IS 'Timestamp when ticket was voided';
COMMENT ON COLUMN public.aggregate_tickets.approved_by IS 'Manager who approved/denied/voided the missing ticket';
COMMENT ON COLUMN public.aggregate_tickets.approved_at IS 'Timestamp of manager action';

-- Update payroll view to exclude voided tickets from driver pay
CREATE OR REPLACE VIEW public.driver_weekly_payroll_summary AS
WITH friday_weeks AS (
  -- Generate Friday-to-Thursday week boundaries
  SELECT
    date_trunc('week', d.dt)::date + 4 AS week_start_friday,
    date_trunc('week', d.dt)::date + 10 AS week_end_thursday
  FROM generate_series(
    (SELECT MIN(ticket_date) FROM aggregate_tickets),
    CURRENT_DATE + interval '1 week',
    '1 week'::interval
  ) AS d(dt)
)
SELECT
  dr.id AS driver_id,
  dr.name AS driver_name,
  dr.employment_type,
  fw.week_start_friday,
  fw.week_end_thursday,
  
  -- Total tickets (excluding voided)
  COUNT(at.id) AS total_tickets,
  
  -- Approved tickets only (excluding voided)
  COUNT(at.id) FILTER (WHERE at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE) AS approved_tickets,
  
  -- Gross pay (voided tickets = $0)
  COALESCE(SUM(CASE 
    WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
    THEN at.total_pay 
    ELSE 0 
  END), 0) AS gross_pay,
  
  -- W2 withholdings
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * 0.062  -- Social Security
    ELSE 0
  END AS social_security_withholding,
  
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * 0.0145  -- Medicare
    ELSE 0
  END AS medicare_withholding,
  
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * 0.12  -- Federal income tax estimate
    ELSE 0
  END AS federal_tax_withholding,
  
  -- Employer portion (W2 only)
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * 0.062  -- Employer Social Security
    ELSE 0
  END AS employer_social_security,
  
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * 0.0145  -- Employer Medicare
    ELSE 0
  END AS employer_medicare,
  
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * 0.006  -- FUTA
    ELSE 0
  END AS employer_futa,
  
  -- Net pay (after W2 withholdings, or gross for 1099)
  CASE 
    WHEN dr.employment_type = 'W2' THEN
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0) * (1 - 0.062 - 0.0145 - 0.12)
    ELSE
      COALESCE(SUM(CASE 
        WHEN at.status = 'Approved' AND COALESCE(at.voided, FALSE) = FALSE 
        THEN at.total_pay 
        ELSE 0 
      END), 0)
  END AS net_pay

FROM drivers dr
CROSS JOIN friday_weeks fw
LEFT JOIN aggregate_tickets at 
  ON at.driver_id = dr.id 
  AND at.ticket_date >= fw.week_start_friday 
  AND at.ticket_date <= fw.week_end_thursday
WHERE fw.week_start_friday >= CURRENT_DATE - interval '6 months'
GROUP BY dr.id, dr.name, dr.employment_type, fw.week_start_friday, fw.week_end_thursday
HAVING COUNT(at.id) > 0
ORDER BY fw.week_start_friday DESC, dr.name;

COMMENT ON VIEW public.driver_weekly_payroll_summary IS 'Friday-to-Thursday weekly payroll with W2/1099 handling. Voided tickets excluded from pay calculations.';
