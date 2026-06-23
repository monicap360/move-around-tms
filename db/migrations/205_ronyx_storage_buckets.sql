-- Formalize the 3 Ronyx storage buckets that initializeRonyxStorage() creates dynamically.
-- Run in Supabase SQL Editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ronyx-tickets',      'ronyx-tickets',      false, 52428800,
   array['image/jpeg','image/png','image/jpg','application/pdf','text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('ronyx-documents',    'ronyx-documents',    false, 52428800,
   array['image/jpeg','image/png','image/jpg','application/pdf','text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('ronyx-driver-files', 'ronyx-driver-files', false, 52428800,
   array['image/jpeg','image/png','image/jpg','application/pdf','text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

-- RLS: authenticated users only
create policy if not exists "ronyx_tickets_auth" on storage.objects
  for all using (bucket_id = 'ronyx-tickets' and auth.role() = 'authenticated')
  with check (bucket_id = 'ronyx-tickets' and auth.role() = 'authenticated');

create policy if not exists "ronyx_documents_auth" on storage.objects
  for all using (bucket_id = 'ronyx-documents' and auth.role() = 'authenticated')
  with check (bucket_id = 'ronyx-documents' and auth.role() = 'authenticated');

create policy if not exists "ronyx_driver_files_auth" on storage.objects
  for all using (bucket_id = 'ronyx-driver-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'ronyx-driver-files' and auth.role() = 'authenticated');
