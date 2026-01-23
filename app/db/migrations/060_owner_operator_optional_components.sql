-- Migration 060: Owner-operator optional components and invoicing enhancements

-- Extend aggregate_tickets with optional components and company segmentation
alter table public.aggregate_tickets
  add column if not exists company_name text default 'Creative',
  add column if not exists fuel_surcharge_amount numeric(12,2),
  add column if not exists spread_amount numeric(12,2),
  add column if not exists detention_amount numeric(12,2),
  add column if not exists detention_ref text,
  add column if not exists show_fuel boolean not null default false,
  add column if not exists show_spread boolean not null default false,
  add column if not exists show_detention boolean not null default false;

-- Extend drivers for owner-operator metadata (used for percentage payouts)
alter table public.drivers
  add column if not exists driver_type text default 'employee'
    check (driver_type in ('employee','owner_operator','contractor')),
  add column if not exists commission_pct numeric(5,2) default 0,
  add column if not exists company_name text default 'Creative';

-- Extend invoices for driver payroll and detention billing
alter table public.ronyx_invoices
  add column if not exists invoice_type text not null default 'regular',
  add column if not exists owner_operator_id uuid references public.drivers(id) on delete set null;

-- Invoice item types lookup (portable enum)
create table if not exists public.ronyx_invoice_item_types (
  code text primary key,
  description text
);

insert into public.ronyx_invoice_item_types(code, description)
values
  ('line_item','Standard line item'),
  ('fuel_surcharge','Fuel surcharge'),
  ('spread','Spread allocation'),
  ('detention_diversion','Detention or Diversion'),
  ('insurance','Insurance'),
  ('other','Other')
on conflict (code) do nothing;

-- Extend invoice items with calculation fields
alter table public.ronyx_invoice_items
  add column if not exists item_type text references public.ronyx_invoice_item_types(code),
  add column if not exists visible boolean not null default false,
  add column if not exists related_ticket_number text,
  add column if not exists truck_number text,
  add column if not exists ticket_date date,
  add column if not exists job_description text,
  add column if not exists full_rate numeric(12,2) default 0,
  add column if not exists ticket_value numeric(12,2) default 0,
  add column if not exists commission_pct numeric(5,2) default 0,
  add column if not exists commission_rate_from_profile numeric(5,2) default 0,
  add column if not exists total_rate_payout numeric(12,2) default 0,
  add column if not exists ticket_total_insurance numeric(12,2) default 0,
  add column if not exists driver_pay numeric(12,2) default 0,
  add column if not exists notes text;

-- Reconciliation tables for optional charges
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

create index if not exists idx_ronyx_invoice_items_ticket_number on public.ronyx_invoice_items(related_ticket_number);
create index if not exists idx_ronyx_invoice_items_truck_number on public.ronyx_invoice_items(truck_number);
create index if not exists idx_ronyx_invoices_owner_operator on public.ronyx_invoices(owner_operator_id);
create index if not exists idx_ronyx_invoice_items_visible on public.ronyx_invoice_items(visible);

-- Compute invoice item financials
create or replace function public.compute_ronyx_invoice_item_pay(p_item_id uuid)
returns void language plpgsql security definer as $$
declare
  v_item record;
  v_owner_commission numeric(5,2);
  v_commission_pct numeric(5,2);
  v_ticket_value numeric(12,2);
  v_total_rate_payout numeric(12,2);
begin
  select * into v_item from public.ronyx_invoice_items where id = p_item_id;
  if not found then
    raise exception 'ronyx_invoice_item % not found', p_item_id;
  end if;

  v_owner_commission := coalesce(
    (select commission_pct from public.drivers
      where id = (select owner_operator_id from public.ronyx_invoices where id = v_item.invoice_id)),
    0
  );
  v_commission_pct := coalesce(v_item.commission_pct, v_owner_commission, 0);

  v_ticket_value := coalesce(v_item.quantity, 0) * coalesce(v_item.full_rate, 0);
  v_total_rate_payout := v_ticket_value
    - coalesce(v_item.ticket_total_insurance, 0)
    - (v_ticket_value * (v_commission_pct / 100.0));

  if v_total_rate_payout < 0 then
    v_total_rate_payout := 0;
  end if;

  update public.ronyx_invoice_items
  set
    ticket_value = v_ticket_value,
    commission_rate_from_profile = v_owner_commission,
    commission_pct = v_commission_pct,
    total_rate_payout = round(v_total_rate_payout::numeric, 2),
    driver_pay = round(v_total_rate_payout::numeric, 2)
  where id = p_item_id;
end;
$$;

create or replace function public.ronyx_invoice_items_after_write_trigger()
returns trigger language plpgsql security definer as $$
begin
  perform public.compute_ronyx_invoice_item_pay(new.id);
  return new;
end;
$$;

drop trigger if exists trg_ronyx_invoice_items_compute_pay on public.ronyx_invoice_items;
create trigger trg_ronyx_invoice_items_compute_pay
after insert or update of quantity, full_rate, ticket_total_insurance, commission_pct
on public.ronyx_invoice_items
for each row execute function public.ronyx_invoice_items_after_write_trigger();

-- Create detention/diversion invoice with ticket_number + 'D'
create or replace function public.create_detention_invoice(
  p_related_ticket_number text,
  p_owner_operator_id uuid,
  p_amount numeric,
  p_company_name text,
  p_notes text default null
)
returns table(created_invoice_id uuid, created_invoice_number text) language plpgsql security definer as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
begin
  v_invoice_number := p_related_ticket_number || 'D';
  if exists (select 1 from public.ronyx_invoices where invoice_number = v_invoice_number) then
    v_invoice_number := v_invoice_number || '-' || (
      select coalesce(max((regexp_replace(invoice_number, '^.*-(\d+)$', '\1')::int)),0) + 1
      from public.ronyx_invoices
      where invoice_number like p_related_ticket_number || 'D-%'
    );
  end if;

  insert into public.ronyx_invoices(invoice_number, invoice_type, owner_operator_id, organization_id)
  values (v_invoice_number, 'detention', p_owner_operator_id, (
    select id from public.organizations where name ilike p_company_name limit 1
  ))
  returning id into v_invoice_id;

  insert into public.ronyx_invoice_items(
    invoice_id, item_type, visible, related_ticket_number, ticket_date, job_description,
    quantity, full_rate, ticket_value, commission_pct, commission_rate_from_profile,
    total_rate_payout, ticket_total_insurance, driver_pay, notes
  )
  values (
    v_invoice_id,
    'detention_diversion',
    true,
    p_related_ticket_number,
    null,
    'Detention/Diversion charge',
    1,
    p_amount,
    p_amount,
    0,
    0,
    p_amount,
    0,
    p_amount,
    p_notes
  );

  update public.ronyx_invoices
  set total_amount = (select coalesce(sum(ticket_value),0) from public.ronyx_invoice_items where invoice_id = v_invoice_id)
  where id = v_invoice_id;

  return query select v_invoice_id, v_invoice_number;
end;
$$;

-- Visible items view for app queries
create or replace view public.ronyx_invoice_items_visible as
select
  ii.*,
  inv.invoice_number,
  inv.invoice_type,
  inv.owner_operator_id,
  inv.organization_id,
  inv.issued_date
from public.ronyx_invoice_items ii
join public.ronyx_invoices inv on inv.id = ii.invoice_id
where ii.visible = true;
