-- ============================================================
-- Migration 168: Manual Payment Options
-- Purpose:
-- - Add Zelle, Cash App, Cash, and Check support
-- - Add manual payment tracking fields to organizations
-- - Add manual payment audit table
-- ============================================================

alter table public.organizations
add column if not exists billing_email text;

alter table public.organizations
add column if not exists payment_method_type text;

alter table public.organizations
add column if not exists payment_status text default 'none';

alter table public.organizations
add column if not exists manual_payment_status text default 'not_required';

alter table public.organizations
add column if not exists manual_payment_method text;

alter table public.organizations
add column if not exists manual_payment_reference text;

alter table public.organizations
add column if not exists manual_payment_amount numeric;

alter table public.organizations
add column if not exists manual_payment_notes text;

alter table public.organizations
add column if not exists manual_payment_submitted_at timestamptz;

alter table public.organizations
add column if not exists manual_payment_confirmed_at timestamptz;

alter table public.organizations
add column if not exists manual_payment_confirmed_by uuid;

alter table public.organizations
add column if not exists payment_instructions text default
'Manual Payment Options:
Zelle: 409-392-9626
Cash App: $GalvestonMonica
Cash: Accepted by approval only. Please request a receipt.
Check: Make checks payable to the approved business name listed on your invoice.
Please include your company name and invoice number in the payment note when available.';

-- Optional check constraint for payment method type
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_payment_method_type_check'
  ) then
    alter table public.organizations
    add constraint organizations_payment_method_type_check
    check (
      payment_method_type is null
      or payment_method_type in (
        'credit_card',
        'debit_card',
        'ach',
        'zelle',
        'cash_app',
        'cash',
        'check',
        'wire',
        'invoice_terms',
        'manual'
      )
    );
  end if;
end $$;

-- Optional check constraint for manual payment status
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_manual_payment_status_check'
  ) then
    alter table public.organizations
    add constraint organizations_manual_payment_status_check
    check (
      manual_payment_status in (
        'not_required',
        'pending_manual_payment',
        'payment_submitted',
        'payment_received',
        'payment_verified',
        'payment_rejected',
        'past_due'
      )
    );
  end if;
end $$;

-- Manual payment log table
create table if not exists public.manual_payment_logs (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null references public.organizations(id) on delete cascade,

  payment_method text not null,
  amount numeric,
  reference text,
  notes text,

  status text not null default 'payment_submitted',

  submitted_by uuid,
  submitted_at timestamptz default now(),

  verified_by uuid,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Status check for manual payment logs
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manual_payment_logs_status_check'
  ) then
    alter table public.manual_payment_logs
    add constraint manual_payment_logs_status_check
    check (
      status in (
        'pending_manual_payment',
        'payment_submitted',
        'payment_received',
        'payment_verified',
        'payment_rejected',
        'past_due'
      )
    );
  end if;
end $$;

-- Method check for manual payment logs
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'manual_payment_logs_method_check'
  ) then
    alter table public.manual_payment_logs
    add constraint manual_payment_logs_method_check
    check (
      payment_method in (
        'zelle',
        'cash_app',
        'cash',
        'check',
        'wire',
        'other'
      )
    );
  end if;
end $$;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_manual_payment_logs_updated_at on public.manual_payment_logs;

create trigger set_manual_payment_logs_updated_at
before update on public.manual_payment_logs
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.manual_payment_logs enable row level security;

-- Helper function, if not already there
create or replace function public.current_user_org()
returns uuid
language sql
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

drop policy if exists "Organization members can view manual payment logs"
on public.manual_payment_logs;

create policy "Organization members can view manual payment logs"
on public.manual_payment_logs
for select
using (
  organization_id = public.current_user_org()
);

drop policy if exists "Organization members can insert manual payment logs"
on public.manual_payment_logs;

create policy "Organization members can insert manual payment logs"
on public.manual_payment_logs
for insert
with check (
  organization_id = public.current_user_org()
);

drop policy if exists "Organization members can update manual payment logs"
on public.manual_payment_logs;

create policy "Organization members can update manual payment logs"
on public.manual_payment_logs
for update
using (
  organization_id = public.current_user_org()
)
with check (
  organization_id = public.current_user_org()
);

-- Update Ronyx with default manual payment instructions
update public.organizations
set
  payment_instructions =
'Manual Payment Options:
Zelle: 409-392-9626
Cash App: $GalvestonMonica
Cash: Accepted by approval only. Please request a receipt.
Check: Make checks payable to the approved business name listed on your invoice.
Please include your company name and invoice number in the payment note when available.',
  manual_payment_status = coalesce(manual_payment_status, 'not_required')
where lower(name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%';

-- Validation
select
  id,
  name,
  organization_code,
  payment_method_type,
  payment_status,
  manual_payment_status,
  payment_instructions
from public.organizations
where lower(name) like '%ronyx%'
   or lower(organization_code) like '%ronyx%';
