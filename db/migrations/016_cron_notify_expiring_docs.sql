-- ==================================================
-- Cron SQL: Insert notifications for HR docs expiring within 30 days
-- Intended to be scheduled via Supabase > Project Settings > Cron
-- ==================================================

-- Insert notifications for approved documents expiring in the next 30 days.
-- Uses metadata to dedupe per (doc_id, expiration_date).
insert into public.notifications (driver_id, message, metadata)
select
  d.driver_id,
  concat('Expiring document: ', d.doc_type, ' for driver ', coalesce(dr.name, d.full_name, 'Unknown'), ' on ', to_char(d.expiration_date, 'YYYY-MM-DD')) as message,
  jsonb_build_object('doc_id', d.id::text, 'expiration_date', to_char(d.expiration_date, 'YYYY-MM-DD'))
from public.driver_documents d
left join public.drivers dr on dr.id = d.driver_id
where d.expiration_date is not null
  and d.status = 'Approved'
  and d.expiration_date < (current_date + interval '30 days')
  and not exists (
    select 1 from public.notifications n
    where (n.metadata->>'doc_id') = d.id::text
      and (n.metadata->>'expiration_date') = to_char(d.expiration_date, 'YYYY-MM-DD')
  );
