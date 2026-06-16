-- Migration 126: ronyx_ach_authorizations
-- ACH processing fee authorization forms sent to subhaulers/vendors for e-signature.

create table if not exists public.ronyx_ach_authorizations (
  id              uuid        primary key default gen_random_uuid(),
  recipient_name  text        not null,
  company_name    text,
  email           text,
  status          text        not null default 'draft',  -- draft, sent, signed
  signed_name     text,
  signed_title    text,
  signature       text,        -- data URL of drawn signature
  signed_at       timestamptz,
  sign_token      text        unique default encode(gen_random_bytes(24), 'hex'),
  sent_at         timestamptz,
  created_by      text,
  organization_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_ach_auth_status on public.ronyx_ach_authorizations(status);
create index if not exists idx_ach_auth_token  on public.ronyx_ach_authorizations(sign_token);
