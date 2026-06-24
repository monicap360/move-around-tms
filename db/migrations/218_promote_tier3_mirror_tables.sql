-- Migration 218: Promote Tier-3 tables — authored as numbered migrations but in
-- the WRONG (app/db/migrations) mirror tree, so the canonical db/migrations chain
-- never saw them. Verbatim DDL from the mirror files, with canonical RLS applied.
--
-- FK note: fuel_reconciliations/spread_allocations→ronyx_invoice_items,
-- ronyx_invoice_payments→ronyx_invoices, fuel_reconciliations→drivers — all
-- resolve against tables created earlier in the chain (run 218 after 001-217).

-- ─── ronyx invoice item types (src: app/db/migrations/060) — no deps, create first
create table if not exists public.ronyx_invoice_item_types (
  code text primary key,
  description text
);

create table if not exists public.ronyx_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.ronyx_invoices(id) on delete cascade,
  payment_date date,
  amount numeric(12,2) not null default 0,
  method text,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ronyx_invoice_payments_invoice_id on public.ronyx_invoice_payments(invoice_id);

create table if not exists public.fuel_reconciliations (
  id uuid primary key default gen_random_uuid(),
  owner_operator_id uuid references public.drivers(id),
  invoice_item_id uuid references public.ronyx_invoice_items(id),
  ticket_number text,
  amount numeric(12,2) not null,
  reconciled_by uuid,
  reconciled_at timestamptz not null default now(),
  notes text
);

create table if not exists public.spread_allocations (
  id uuid primary key default gen_random_uuid(),
  invoice_item_id uuid references public.ronyx_invoice_items(id),
  ticket_number text,
  amount numeric(12,2) not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  notes text
);

-- ─── location_geofences (src: app/db/migrations/049) — note: bigserial PK (verbatim)
create table if not exists public.location_geofences (
  geofence_id bigserial primary key,
  project_id text,
  location_type text not null check (location_type in ('pickup','dump','scale','yard')),
  location_name text not null,
  address text,
  center_lat numeric(10,8),
  center_lon numeric(11,8),
  radius_miles numeric(5,2) not null default 0.25,
  polygon_coordinates jsonb,
  requires_photo boolean not null default true,
  requires_signature boolean not null default true,
  allowed_materials jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_project_geofences on public.location_geofences(project_id, location_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS — canonical template applied to every table promoted above.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'ronyx_invoice_item_types','ronyx_invoice_payments','fuel_reconciliations',
    'spread_allocations','location_geofences'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'auth_all_'||t, t);
    execute format('create policy %I on public.%I for all using (auth.role() = ''authenticated'')', 'auth_all_'||t, t);
    execute format('drop policy if exists %I on public.%I', 'super_admin_'||t, t);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.profiles p '
      || 'where p.user_id = auth.uid() and (lower(coalesce(p.role,'''')) in (''super_admin'',''super admin'') '
      || 'or p.is_platform_admin = true)))', 'super_admin_'||t, t);
  end loop;
end $$;
