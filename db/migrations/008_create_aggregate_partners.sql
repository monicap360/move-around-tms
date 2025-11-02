-- ==================================================
-- Migration: Create aggregate_partners table
-- Tracks partner companies for aggregate tickets
-- ==================================================

-- Enable UUID generation (needed for gen_random_uuid)
create extension if not exists "pgcrypto";

create table if not exists public.aggregate_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  email_domain text,              -- e.g. "@martinmarietta.com"
  regex_patterns jsonb,           -- { "ticket_no": "Ticket\\s*#\\s*(\\w+)", "tons": "(\\d+(?:\\.\\d+)?)\\s*TONS" }
  pay_rate numeric(10,2),
  bill_rate numeric(10,2),
  material_codes jsonb,           -- map of material → rate adjustments
  active boolean default true,
  created_at timestamp default now()
);

-- Helpful indexes
create index if not exists idx_aggregate_partners_name on public.aggregate_partners(name);
create index if not exists idx_aggregate_partners_active on public.aggregate_partners(active);
create index if not exists idx_aggregate_partners_email_domain on public.aggregate_partners(email_domain);

comment on table public.aggregate_partners is 'Partner companies for aggregate ticket processing and OCR parsing';
comment on column public.aggregate_partners.regex_patterns is 'JSONB patterns for OCR field extraction';
comment on column public.aggregate_partners.material_codes is 'JSONB map of material types to rate adjustments';
