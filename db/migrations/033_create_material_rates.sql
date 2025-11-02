-- Migration 033: Create material rates table for aggregate pricing
-- Purpose: Define material types with default rates and enable per-partner overrides

create table if not exists public.material_rates (
  id uuid primary key default gen_random_uuid(),
  material_name text not null unique,
  material_code text,
  default_bill_rate numeric(10,2) not null,
  default_pay_rate numeric(10,2) not null,
  unit_type text check (unit_type in ('Load','Yard','Ton','Hour')) default 'Load',
  description text,
  active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Index for active materials lookup
create index if not exists idx_material_rates_active on public.material_rates(active);
create index if not exists idx_material_rates_name on public.material_rates(material_name);

-- Comments
comment on table public.material_rates is 'Master list of aggregate materials with default billing and pay rates';
comment on column public.material_rates.material_code is 'Optional short code for material (e.g., LIME, GRAVEL)';
comment on column public.material_rates.default_bill_rate is 'Default customer billing rate';
comment on column public.material_rates.default_pay_rate is 'Default driver/carrier pay rate';
