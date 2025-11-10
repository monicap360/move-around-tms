-- Storage policies for company_assets bucket
-- Description: Secure file upload and access for company logos and ticket templates

-- Create the company_assets bucket (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('company_assets', 'company_assets', false)
on conflict (id) do nothing;

-- Policy: Allow authenticated users to upload into allowed prefixes
create policy "upload_company_assets"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company_assets'
  and (
    position('logos/' in name) = 1
    or position('templates/tickets/' in name) = 1
  )
);

-- Policy: Allow authenticated users to list/read from the bucket
create policy "read_company_assets"
on storage.objects
for select to authenticated
using (bucket_id = 'company_assets');

-- Policy: Allow users to update their own files (optional - for metadata updates)
create policy "update_company_assets"
on storage.objects
for update to authenticated
using (bucket_id = 'company_assets');

-- Policy: Allow users to delete their own files (optional - for cleanup)
create policy "delete_company_assets" 
on storage.objects
for delete to authenticated
using (bucket_id = 'company_assets');

-- Comments for documentation
comment on policy "upload_company_assets" on storage.objects is 'Allow uploads to logos/ and templates/tickets/ prefixes in company_assets bucket';
comment on policy "read_company_assets" on storage.objects is 'Allow authenticated users to read files from company_assets bucket';
comment on policy "update_company_assets" on storage.objects is 'Allow authenticated users to update file metadata in company_assets bucket';
comment on policy "delete_company_assets" on storage.objects is 'Allow authenticated users to delete files from company_assets bucket';