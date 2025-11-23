-- Migration 037: Vendors, Factoring, AP/AR, and invoice extensions

-- Vendors (generic company table used for AP vendors and AR customers)
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('Customer','Vendor','Factoring')),
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  ein text,
  dot_number text,
  mc_number text,
  active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_vendors_name on public.vendors(name);
create index if not exists idx_vendors_type on public.vendors(type);
create index if not exists idx_vendors_active on public.vendors(active);

comment on table public.vendors is 'Companies: customers (AR), vendors (AP), and factoring providers';

-- Factoring companies (detailed terms)
create table if not exists public.factoring_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  contact_email text,
  contact_phone text,
  advance_rate numeric(5,4) default 0.90, -- 90% advance
  fee_rate numeric(5,4) default 0.0200,    -- 2% fee
  reserve_rate numeric(5,4) default 0.10,  -- 10% reserve
  standard_days int default 30,
  address text,
  active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_factoring_companies_name on public.factoring_companies(name);
create index if not exists idx_factoring_companies_active on public.factoring_companies(active);

comment on table public.factoring_companies is 'Factoring providers and terms';

-- Extend invoices to include AR/Factoring context and interstate/intrastate
alter table public.invoices
  add column if not exists customer_id uuid references public.vendors(id) on delete set null,
  add column if not exists ar_status text default 'Open' check (ar_status in ('Open','Paid','Factored','Cancelled')),
  add column if not exists factoring_company_id uuid references public.factoring_companies(id) on delete set null,
  add column if not exists movement_type text check (movement_type in ('Interstate','Intrastate')),
  add column if not exists primary_state char(2);

create index if not exists idx_invoices_customer_id on public.invoices(customer_id);
create index if not exists idx_invoices_ar_status on public.invoices(ar_status);
create index if not exists idx_invoices_factoring_company_id on public.invoices(factoring_company_id);
create index if not exists idx_invoices_movement_type on public.invoices(movement_type);
create index if not exists idx_invoices_primary_state on public.invoices(primary_state);

-- Accounts Receivable transactions (optional record separate from invoices)
create table if not exists public.ar_transactions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  customer_id uuid references public.vendors(id) on delete set null,
  status text not null default 'Open' check (status in ('Open','Paid','Factored','Cancelled')),
  factoring_company_id uuid references public.factoring_companies(id) on delete set null,
  factoring_fee numeric(12,2),
  net_proceeds numeric(12,2),
  movement_type text check (movement_type in ('Interstate','Intrastate')),
  primary_state char(2),
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_ar_invoice_id on public.ar_transactions(invoice_id);
create index if not exists idx_ar_customer_id on public.ar_transactions(customer_id);
create index if not exists idx_ar_status on public.ar_transactions(status);

comment on table public.ar_transactions is 'AR ledger entries for invoices, including factoring details';

-- Accounts Payable Bills
create table if not exists public.ap_bills (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete set null,
  bill_number text,
  bill_date date,
  due_date date,
  amount numeric(12,2) not null,
  status text not null default 'Open' check (status in ('Open','Paid','Overdue','Cancelled')),
  description text,
  movement_type text check (movement_type in ('Interstate','Intrastate')),
  primary_state char(2),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_ap_vendor_id on public.ap_bills(vendor_id);
create index if not exists idx_ap_status on public.ap_bills(status);
create index if not exists idx_ap_due_date on public.ap_bills(due_date);

comment on table public.ap_bills is 'AP vendor bills and expenses, tagged with interstate/intrastate when applicable';
