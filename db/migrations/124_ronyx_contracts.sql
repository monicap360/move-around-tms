-- Migration 124: ronyx_contracts
-- Hauling/service contracts for customer companies Ronyx works for.

create table if not exists public.ronyx_contracts (
  id              uuid         primary key default gen_random_uuid(),
  company_name    text         not null,
  customer_id     uuid         references public.ronyx_customers(id) on delete set null,
  contract_type   text         not null default 'hauling',
  status          text         not null default 'active',
  start_date      date,
  end_date        date,
  rate_type       text         not null default 'per_ton',
  rate_amount     numeric(10,2),
  material_type   text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  notes           text,
  signed_date     date,
  signed_by       text,
  file_url        text,
  organization_id uuid,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

create index if not exists idx_ronyx_contracts_company on public.ronyx_contracts(company_name);
create index if not exists idx_ronyx_contracts_status  on public.ronyx_contracts(status);

-- Seed the two active customer companies if they don't exist yet
insert into public.ronyx_customers (customer_name, customer_type, payment_terms)
select 'TC Red Wine Services', 'general_contractor', 'net_30'
where not exists (
  select 1 from public.ronyx_customers where lower(customer_name) = 'tc red wine services'
);

insert into public.ronyx_customers (customer_name, customer_type, payment_terms)
select 'BAS Equipment & Trucking Services, LLC', 'general_contractor', 'net_30'
where not exists (
  select 1 from public.ronyx_customers where lower(customer_name) = 'bas equipment & trucking services, llc'
);
