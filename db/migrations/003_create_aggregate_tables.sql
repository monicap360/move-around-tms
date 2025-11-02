-- Migration 003: Create aggregate tables for tickets and quotes
-- Run this in Supabase SQL Editor to create the tables for aggregate billing

-- Enable UUIDs
create extension if not exists "pgcrypto";

-- ==================================================
-- 1️⃣ Aggregate Tickets Table (using fleets)
-- ==================================================
create table if not exists aggregate_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text,
  driver_id uuid references drivers(id) on delete set null,
  truck_id uuid references fleets(id) on delete set null,
  material text,
  unit_type text check (unit_type in ('Load','Yard','Ton','Hour')),
  quantity numeric(10,2),
  pay_rate numeric(10,2),
  bill_rate numeric(10,2),
  ticket_date date,
  upload_url text,
  total_pay numeric(12,2) generated always as (quantity * pay_rate) stored,
  total_bill numeric(12,2) generated always as (quantity * bill_rate) stored,
  total_profit numeric(12,2) generated always as ((quantity * bill_rate) - (quantity * pay_rate)) stored,
  status text default 'Pending',
  created_at timestamp default now()
);

-- ==================================================
-- 2️⃣ Aggregate Quotes Table
-- ==================================================
create table if not exists aggregate_quotes (
  id uuid primary key default gen_random_uuid(),
  company text,
  contact_name text,
  contact_email text,
  billing_type text check (billing_type in ('Load','Yard','Ton','Hour')),
  rate numeric(10,2),
  pay_rate numeric(10,2),
  material text,
  notes text,
  total_profit numeric(12,2),
  status text default 'Draft',
  signature_url text,
  created_at timestamp default now()
);

-- Create indexes for common queries
create index if not exists idx_aggregate_tickets_driver on aggregate_tickets(driver_id);
create index if not exists idx_aggregate_tickets_truck on aggregate_tickets(truck_id);
create index if not exists idx_aggregate_tickets_date on aggregate_tickets(ticket_date);
create index if not exists idx_aggregate_tickets_status on aggregate_tickets(status);
create index if not exists idx_aggregate_quotes_company on aggregate_quotes(company);
create index if not exists idx_aggregate_quotes_status on aggregate_quotes(status);

-- Comments for documentation
comment on table aggregate_tickets is 'Individual aggregate hauling tickets with computed pay, bill, and profit';
comment on table aggregate_quotes is 'Customer quotes for aggregate hauling services';

-- ==================================================
-- 3️⃣ Aggregate Quotes Summary View
-- ==================================================
create or replace view aggregate_quotes_summary as
select
  q.id,
  q.company,
  q.contact_name,
  q.contact_email,
  q.material,
  q.billing_type,
  q.rate as bill_rate,
  q.pay_rate,
  (q.rate - q.pay_rate) as profit_per_unit,
  case
    when q.signature_url is not null and q.signature_url <> '' then 'Signed'
    else 'Pending'
  end as signature_status,
  q.status,
  q.created_at
from public.aggregate_quotes q
order by q.created_at desc;
