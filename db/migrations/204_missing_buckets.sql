-- Create all storage buckets referenced in app code that don't exist yet.
-- Run in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values
  ('driver-compliance-docs', 'driver-compliance-docs', false),
  ('ronyx-imports',          'ronyx-imports',          false),
  ('ticket-uploads',         'ticket-uploads',         false),
  ('avatars',                'avatars',                false)
on conflict (id) do nothing;

-- Policies for new buckets (service-role bypasses RLS, these cover client-side calls)

-- driver-compliance-docs: API-only, authenticated read
create policy if not exists "driver_compliance_docs_auth" on storage.objects
  for all using (bucket_id = 'driver-compliance-docs' and auth.role() = 'authenticated')
  with check (bucket_id = 'driver-compliance-docs' and auth.role() = 'authenticated');

-- ronyx-imports: authenticated staff only
create policy if not exists "ronyx_imports_auth" on storage.objects
  for all using (bucket_id = 'ronyx-imports' and auth.role() = 'authenticated')
  with check (bucket_id = 'ronyx-imports' and auth.role() = 'authenticated');

-- ticket-uploads: authenticated staff only
create policy if not exists "ticket_uploads_auth" on storage.objects
  for all using (bucket_id = 'ticket-uploads' and auth.role() = 'authenticated')
  with check (bucket_id = 'ticket-uploads' and auth.role() = 'authenticated');

-- avatars: authenticated read/write
create policy if not exists "avatars_auth" on storage.objects
  for all using (bucket_id = 'avatars' and auth.role() = 'authenticated')
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
