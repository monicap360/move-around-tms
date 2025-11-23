-- Migration 036: E-signature envelopes, recipients, and events

create table if not exists public.esign_envelopes (
  id uuid primary key default gen_random_uuid(),
  document_type text check (document_type in ('Quote','Invoice','Other')) not null,
  related_id uuid,
  filename text not null,
  original_pdf_path text not null,
  signed_pdf_path text,
  status text check (status in ('Created','Sent','Viewed','Signed','Declined','Expired')) default 'Created',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.esign_recipients (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.esign_envelopes(id) on delete cascade,
  role text default 'Signer',
  name text not null,
  email text not null,
  token text unique not null,
  token_expires_at timestamp not null,
  status text check (status in ('Pending','Viewed','Signed','Declined','Expired')) default 'Pending',
  signed_at timestamp,
  created_at timestamp default now()
);

create table if not exists public.esign_events (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.esign_envelopes(id) on delete cascade,
  recipient_id uuid references public.esign_recipients(id) on delete set null,
  event_type text not null,
  ip text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp default now()
);

create index if not exists idx_esign_recips_envelope on public.esign_recipients(envelope_id);
create index if not exists idx_esign_events_envelope on public.esign_events(envelope_id);

comment on table public.esign_envelopes is 'E-sign envelopes referencing original and signed PDFs in storage bucket "esign"';
comment on column public.esign_envelopes.original_pdf_path is 'Storage object path for original PDF (e.g., esign/envelopes/{id}/original.pdf)';
