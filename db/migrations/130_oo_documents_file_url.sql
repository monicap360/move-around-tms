-- Add file_url to ronyx_oo_documents so uploaded COIs / W-9s / contracts can be downloaded
ALTER TABLE public.ronyx_oo_documents
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

-- Create ronyx-imports storage bucket policy (run after creating the bucket in dashboard)
-- The upload-file API creates this bucket automatically via the service role.
