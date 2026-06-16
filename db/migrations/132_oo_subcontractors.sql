-- Subcontractors under Owner Operators
-- A subcontractor is a company that hauls under a parent OO.
-- Each subcontractor can have their own drivers tracked here.

create table if not exists public.ronyx_oo_subcontractors (
  id            uuid primary key default gen_random_uuid(),
  oo_id         uuid not null references public.ronyx_owner_operators(id) on delete cascade,
  company_name  text not null,
  contact_name  text,
  contact_phone text,
  contact_email text,
  mc_number     text,
  dot_number    text,
  created_at    timestamptz default now()
);

create table if not exists public.ronyx_oo_subcontractor_drivers (
  id             uuid primary key default gen_random_uuid(),
  sub_id         uuid not null references public.ronyx_oo_subcontractors(id) on delete cascade,
  oo_id          uuid not null references public.ronyx_owner_operators(id) on delete cascade,
  name           text not null,
  phone          text,
  cdl_number     text,
  cdl_expiration date,
  created_at     timestamptz default now()
);

-- Indexes
create index if not exists idx_ronyx_oo_subcontractors_oo_id  on public.ronyx_oo_subcontractors(oo_id);
create index if not exists idx_ronyx_oo_sub_drivers_sub_id    on public.ronyx_oo_subcontractor_drivers(sub_id);
create index if not exists idx_ronyx_oo_sub_drivers_oo_id     on public.ronyx_oo_subcontractor_drivers(oo_id);
