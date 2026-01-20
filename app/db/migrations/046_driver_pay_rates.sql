-- Migration 046: Driver pay rates for settlement calculations

create table if not exists public.driver_pay_rates (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null,
  rate_type text not null check (rate_type in ('PER_TON', 'PER_LOAD', 'PER_MILE', 'PER_HOUR')),
  rate_value numeric(10,2) not null,
  effective_date date not null,
  material_type text,
  customer_id uuid,
  job_id uuid,
  equipment_type text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_driver_pay_rates_driver_id
  on public.driver_pay_rates(driver_id);

create index if not exists idx_driver_pay_rates_default
  on public.driver_pay_rates(driver_id, is_default);
