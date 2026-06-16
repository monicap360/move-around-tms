-- Migration 125: ronyx_subhauler_agreements
-- Stores filled subhauler agreements with signature status and token-based signing links.

create table if not exists public.ronyx_subhauler_agreements (
  id                    uuid        primary key default gen_random_uuid(),
  -- Subhauler info
  subhauler_name        text        not null,
  subhauler_address     text,
  subhauler_attn        text,
  subhauler_phone       text,
  subhauler_email       text,
  subhauler_usdot       text,
  -- Trucks JSON: [{ type, truck_number }]
  trucks                jsonb       not null default '[]',
  -- Performance dates
  commencement_day      text,
  commencement_month    text,
  commencement_year     text,
  completion_day        text,
  completion_month      text,
  completion_year       text,
  -- General contractor / project
  general_contractor    text,
  gc_address            text,
  project_name          text,
  -- Signature data
  status                text        not null default 'draft',  -- draft, sent, signed, completed
  prime_carrier_sig     text,        -- data URL of drawn signature (Ronyx side)
  prime_carrier_signed_by text,
  prime_carrier_signed_at timestamptz,
  subhauler_sig         text,        -- data URL of drawn signature (subhauler side)
  subhauler_signed_by   text,
  subhauler_signed_at   timestamptz,
  -- Token for the public signing link
  sign_token            text        unique default encode(gen_random_bytes(24), 'hex'),
  sent_at               timestamptz,
  created_by            text,
  organization_id       uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_subhauler_agreements_status on public.ronyx_subhauler_agreements(status);
create index if not exists idx_subhauler_agreements_token  on public.ronyx_subhauler_agreements(sign_token);
