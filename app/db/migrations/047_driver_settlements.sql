-- Migration 047: Driver settlement items + pay rate adjustments

alter table public.driver_pay_rates
  add column if not exists rate_name text;

alter table public.driver_pay_rates
  alter column driver_id type text using driver_id::text,
  alter column customer_id type text using customer_id::text,
  alter column job_id type text using job_id::text;

create index if not exists idx_driver_pay_rates_priority
  on public.driver_pay_rates(driver_id, is_default, material_type, customer_id);

create table if not exists public.driver_settlement_items (
  id uuid primary key default gen_random_uuid(),
  driver_id text not null,
  load_id text not null,
  ticket_number text not null,
  week_end_date date not null,
  quantity numeric(10,2) not null,
  rate_type text not null check (rate_type in ('PER_TON', 'PER_LOAD', 'PER_MILE', 'PER_HOUR')),
  rate_value numeric(10,2) not null,
  calculated_amount numeric(10,2) not null,
  material_type text,
  customer_id text,
  status text not null default 'PENDING' check (status in ('PENDING', 'LOCKED', 'PAID', 'DISPUTED')),
  dispute_notes text,
  created_at timestamptz default now()
);

create index if not exists idx_driver_settlement_week
  on public.driver_settlement_items(driver_id, week_end_date, status);
