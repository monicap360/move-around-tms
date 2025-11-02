-- Migration 038: Quote Requests from website

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  phone text,
  details text,
  source text, -- e.g., website form slug
  status text not null default 'New' check (status in ('New','Replied','Closed')),
  internal_notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_quote_requests_status on public.quote_requests(status);
create index if not exists idx_quote_requests_created_at on public.quote_requests(created_at);
