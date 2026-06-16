-- Migration 123: ronyx_driver_documents
-- Stores uploaded driver documents for the Ronyx driver profile page.
-- Supports all required doc types without legacy OCR constraints.

create table if not exists public.ronyx_driver_documents (
  id            uuid        primary key default gen_random_uuid(),
  driver_id     uuid        not null references public.drivers(id) on delete cascade,
  doc_type      text        not null,
  file_url      text,
  status        text        not null default 'uploaded',
  expires_on    date,
  notes         text,
  uploaded_by   text,
  organization_id uuid,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_ronyx_driver_docs_driver  on public.ronyx_driver_documents(driver_id);
create index if not exists idx_ronyx_driver_docs_type    on public.ronyx_driver_documents(doc_type);
create index if not exists idx_ronyx_driver_docs_expires on public.ronyx_driver_documents(expires_on);
