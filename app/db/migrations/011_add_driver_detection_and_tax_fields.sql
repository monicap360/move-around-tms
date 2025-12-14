-- ==================================================
-- Migration: Add driver detection and tax fields
-- ==================================================

-- Add driver detection fields to aggregate_tickets
alter table public.aggregate_tickets
  add column if not exists driver_name_ocr text,
  add column if not exists driver_matched_confidence numeric(5,2),
  add column if not exists auto_matched boolean default false;

-- Add tax and employment type to drivers table
alter table public.drivers
  add column if not exists tax_status text check (tax_status in ('W2','1099')) default 'W2',
  add column if not exists hourly_rate numeric(10,2),
  add column if not exists ssn_last4 text,
  add column if not exists ein text;

-- Create driver aliases table for OCR matching
create table if not exists public.driver_aliases (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id) on delete cascade,
  alias text not null,
  confidence_boost numeric(5,2) default 10.0,
  created_at timestamp default now()
);

create index if not exists idx_driver_aliases_driver on public.driver_aliases(driver_id);
create index if not exists idx_driver_aliases_alias on public.driver_aliases(alias);

comment on table public.driver_aliases is 'Alternative names/spellings for driver matching in OCR';
comment on column public.aggregate_tickets.driver_name_ocr is 'Driver name as extracted from OCR';
comment on column public.aggregate_tickets.auto_matched is 'Whether driver was auto-matched via OCR';
comment on column public.drivers.tax_status is 'W2 employee or 1099 contractor';
comment on column public.drivers.hourly_rate is 'Base hourly rate for W2 employees';
