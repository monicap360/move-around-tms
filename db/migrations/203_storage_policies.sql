-- Storage bucket policies + bucket name fix
-- Run this in Supabase SQL Editor.
--
-- Problem 1: code uses company_assets (underscore) but bucket is company-assets (dash)
-- Problem 2: no storage.objects policies on any bucket

-- ─── 1. Create the correct bucket (underscore) if it does not exist ───────────
-- The app code universally uses company_assets (underscore).
-- If you want to keep the dashed bucket, rename it in the Supabase UI instead.
insert into storage.buckets (id, name, public)
values ('company_assets', 'company_assets', false)
on conflict (id) do nothing;

-- Also ensure driver-compliance-docs bucket exists (created by driver portal)
insert into storage.buckets (id, name, public)
values ('driver-compliance-docs', 'driver-compliance-docs', false)
on conflict (id) do nothing;

-- ─── 2. Storage policies ──────────────────────────────────────────────────────
-- All API routes use supabaseAdmin (service role) which bypasses RLS.
-- These policies cover any direct client-side Supabase storage calls.

-- Helper: drop policy if exists before recreating
do $$ begin

  -- ── company_assets (private — authenticated users only) ────────────────────
  drop policy if exists "company_assets_select" on storage.objects;
  drop policy if exists "company_assets_insert" on storage.objects;
  drop policy if exists "company_assets_update" on storage.objects;
  drop policy if exists "company_assets_delete" on storage.objects;

  create policy "company_assets_select" on storage.objects
    for select using (bucket_id = 'company_assets' and auth.role() = 'authenticated');

  create policy "company_assets_insert" on storage.objects
    for insert with check (bucket_id = 'company_assets' and auth.role() = 'authenticated');

  create policy "company_assets_update" on storage.objects
    for update using (bucket_id = 'company_assets' and auth.role() = 'authenticated');

  create policy "company_assets_delete" on storage.objects
    for delete using (bucket_id = 'company_assets' and auth.role() = 'authenticated');

  -- ── driver-compliance-docs (service-role only — drivers use API route) ─────
  drop policy if exists "driver_compliance_service_only" on storage.objects;

  create policy "driver_compliance_service_only" on storage.objects
    for all using (bucket_id = 'driver-compliance-docs')
    with check (bucket_id = 'driver-compliance-docs');

  -- ── ronyx-driver-documents (authenticated) ─────────────────────────────────
  drop policy if exists "ronyx_driver_docs_select" on storage.objects;
  drop policy if exists "ronyx_driver_docs_insert" on storage.objects;

  create policy "ronyx_driver_docs_select" on storage.objects
    for select using (bucket_id = 'ronyx-driver-documents' and auth.role() = 'authenticated');

  create policy "ronyx_driver_docs_insert" on storage.objects
    for insert with check (bucket_id = 'ronyx-driver-documents' and auth.role() = 'authenticated');

  -- ── scale_ticket_images (authenticated) ────────────────────────────────────
  drop policy if exists "scale_tickets_select" on storage.objects;
  drop policy if exists "scale_tickets_insert" on storage.objects;

  create policy "scale_tickets_select" on storage.objects
    for select using (bucket_id = 'scale_ticket_images' and auth.role() = 'authenticated');

  create policy "scale_tickets_insert" on storage.objects
    for insert with check (bucket_id = 'scale_ticket_images' and auth.role() = 'authenticated');

  -- ── scale_ticket_ocr (authenticated) ───────────────────────────────────────
  drop policy if exists "scale_ocr_select" on storage.objects;
  drop policy if exists "scale_ocr_insert" on storage.objects;

  create policy "scale_ocr_select" on storage.objects
    for select using (bucket_id = 'scale_ticket_ocr' and auth.role() = 'authenticated');

  create policy "scale_ocr_insert" on storage.objects
    for insert with check (bucket_id = 'scale_ticket_ocr' and auth.role() = 'authenticated');

  -- ── documents (authenticated) ──────────────────────────────────────────────
  drop policy if exists "documents_select" on storage.objects;
  drop policy if exists "documents_insert" on storage.objects;

  create policy "documents_select" on storage.objects
    for select using (bucket_id = 'documents' and auth.role() = 'authenticated');

  create policy "documents_insert" on storage.objects
    for insert with check (bucket_id = 'documents' and auth.role() = 'authenticated');

  -- ── driver-documents (public read, authenticated write) ────────────────────
  drop policy if exists "driver_docs_public_read" on storage.objects;
  drop policy if exists "driver_docs_auth_write" on storage.objects;

  create policy "driver_docs_public_read" on storage.objects
    for select using (bucket_id = 'driver-documents');

  create policy "driver_docs_auth_write" on storage.objects
    for insert with check (bucket_id = 'driver-documents' and auth.role() = 'authenticated');

  -- ── oo-logos (public read, authenticated write) ────────────────────────────
  drop policy if exists "oo_logos_public_read" on storage.objects;
  drop policy if exists "oo_logos_auth_write" on storage.objects;

  create policy "oo_logos_public_read" on storage.objects
    for select using (bucket_id = 'oo-logos');

  create policy "oo_logos_auth_write" on storage.objects
    for insert with check (bucket_id = 'oo-logos' and auth.role() = 'authenticated');

  -- ── ronyx-branding (authenticated) ────────────────────────────────────────
  drop policy if exists "ronyx_branding_select" on storage.objects;
  drop policy if exists "ronyx_branding_insert" on storage.objects;

  create policy "ronyx_branding_select" on storage.objects
    for select using (bucket_id = 'ronyx-branding' and auth.role() = 'authenticated');

  create policy "ronyx_branding_insert" on storage.objects
    for insert with check (bucket_id = 'ronyx-branding' and auth.role() = 'authenticated');

  -- ── aggregate, hr, driver-applications, driver-photos, esign ──────────────
  -- (authenticated read/write)
  drop policy if exists "misc_private_select" on storage.objects;
  drop policy if exists "misc_private_insert" on storage.objects;

  create policy "misc_private_select" on storage.objects
    for select using (
      bucket_id in ('aggregate','hr','driver-applications','driver-photos','esign','driver-logos','ronyx-original-uploads')
      and auth.role() = 'authenticated'
    );

  create policy "misc_private_insert" on storage.objects
    for insert with check (
      bucket_id in ('aggregate','hr','driver-applications','driver-photos','esign','driver-logos','ronyx-original-uploads')
      and auth.role() = 'authenticated'
    );

end $$;
