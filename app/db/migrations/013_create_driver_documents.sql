-- ==================================================
-- Migration: Create driver_documents (HR docs)
-- Stores OCR-scanned HR documents like Driver License and Medical Certificate
-- ==================================================

create extension if not exists "pgcrypto";

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id) on delete set null,
  doc_type text check (doc_type in ('Driver License','Medical Certificate','Insurance','MVR','Other')) not null default 'Other',
  full_name text,
  license_number text,
  state text,
  issue_date date,
  expiration_date date,
  image_url text,
  ocr_raw_text text,
  ocr_confidence numeric(5,2),
  auto_matched boolean default false,
  driver_matched_confidence numeric(5,2),
  status text check (status in ('Pending Manager Review','Approved','Denied')) default 'Pending Manager Review',
  notes text,
  created_at timestamp default now()
);

-- Helpful indexes
create index if not exists idx_driver_documents_driver on public.driver_documents(driver_id);
create index if not exists idx_driver_documents_expiration on public.driver_documents(expiration_date);
create index if not exists idx_driver_documents_status on public.driver_documents(status);
create index if not exists idx_driver_documents_doc_type on public.driver_documents(doc_type);

comment on table public.driver_documents is 'HR documents (license, med cert, etc.) extracted via OCR and pending manager review';
comment on column public.driver_documents.doc_type is 'Type of HR document';
comment on column public.driver_documents.ocr_confidence is 'Average OCR confidence (0-100)';
