-- Migration 050: Multi-Leg Shipments Support
-- Purpose: Support tickets with multiple pickups/deliveries (legs)

create table if not exists ticket_legs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references aggregate_tickets(id) on delete cascade,
  leg_number integer not null, -- 1, 2, 3, etc.
  leg_type text not null check (leg_type in ('pickup', 'delivery', 'stop')),
  location_name text not null,
  address text,
  city text,
  state text,
  zip_code text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  scheduled_date date,
  actual_date date,
  scheduled_time time,
  actual_time time,
  quantity numeric(10,2), -- Quantity for this leg
  material text,
  notes text,
  bol_number text, -- Unique BOL for this leg
  pod_received boolean default false,
  pod_received_at timestamptz,
  status text default 'pending' check (status in ('pending', 'in_transit', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(ticket_id, leg_number)
);

-- Leg-level financials
create table if not exists ticket_leg_financials (
  id uuid primary key default gen_random_uuid(),
  leg_id uuid not null references ticket_legs(id) on delete cascade,
  pay_rate numeric(10,2),
  bill_rate numeric(10,2),
  quantity numeric(10,2),
  total_pay numeric(12,2) generated always as (quantity * pay_rate) stored,
  total_bill numeric(12,2) generated always as (quantity * bill_rate) stored,
  total_profit numeric(12,2) generated always as ((quantity * bill_rate) - (quantity * pay_rate)) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leg documents
create table if not exists ticket_leg_documents (
  id uuid primary key default gen_random_uuid(),
  leg_id uuid not null references ticket_legs(id) on delete cascade,
  document_type text not null check (document_type in ('BOL', 'POD', 'Scale_Ticket', 'Invoice', 'Other')),
  document_url text not null,
  document_name text,
  uploaded_at timestamptz default now(),
  uploaded_by uuid references auth.users(id) on delete set null
);

-- Indexes
create index if not exists idx_ticket_legs_ticket on ticket_legs(ticket_id);
create index if not exists idx_ticket_legs_number on ticket_legs(ticket_id, leg_number);
create index if not exists idx_ticket_leg_financials_leg on ticket_leg_financials(leg_id);
create index if not exists idx_ticket_leg_documents_leg on ticket_leg_documents(leg_id);

-- RLS Policies
alter table ticket_legs enable row level security;
alter table ticket_leg_financials enable row level security;
alter table ticket_leg_documents enable row level security;

create policy "Users can view ticket legs"
  on ticket_legs
  for select
  using (true); -- Adjust based on organization structure

create policy "Users can view leg financials"
  on ticket_leg_financials
  for select
  using (true);

create policy "Users can view leg documents"
  on ticket_leg_documents
  for select
  using (true);

-- Comments
comment on table ticket_legs is 'Multi-leg shipment support - multiple pickups/deliveries per ticket';
comment on table ticket_leg_financials is 'Per-leg financial breakdown for multi-leg tickets';
comment on table ticket_leg_documents is 'Documents specific to each leg (BOL, POD, etc.)';
