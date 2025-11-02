-- ==================================================
-- Migration: View for driver documents expiring within 60 days
-- ==================================================

create or replace view public.driver_documents_expiring as
select
  d.*, 
  (d.expiration_date - current_date) as days_until_expiration
from public.driver_documents d
where d.expiration_date is not null
  and d.status = 'Approved'
  and d.expiration_date <= current_date + interval '60 days'
order by d.expiration_date asc;

comment on view public.driver_documents_expiring is 'HR documents expiring within the next 60 days (Approved only)';
