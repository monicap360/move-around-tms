-- ==================================================
-- Migration: Realtime notifications for HR doc expirations
-- ==================================================

create or replace function public.notify_expiring_hr_docs()
returns trigger as $$
begin
  if NEW.expiration_date is not null
     and NEW.status = 'Approved'
     and NEW.expiration_date < (current_date + interval '30 days') then
    insert into public.notifications (driver_id, message, metadata)
    values (
      NEW.driver_id,
      '⚠️ Document ' || NEW.doc_type || ' is expiring soon! (Driver ' || coalesce(NEW.full_name, 'Unknown') || ')',
      jsonb_build_object('doc_id', NEW.id::text, 'expiration_date', to_char(NEW.expiration_date, 'YYYY-MM-DD'))
    )
    on conflict ((metadata->>'doc_id'), (metadata->>'expiration_date')) do nothing;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger on insert or update on driver_documents
create or replace trigger trg_hr_expiration_alert
after insert or update on public.driver_documents
for each row
when (NEW.expiration_date is not null and NEW.status = 'Approved')
execute function public.notify_expiring_hr_docs();
