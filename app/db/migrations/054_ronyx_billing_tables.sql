-- Ronyx billing tables for invoices, line items, and payments

create table if not exists public.ronyx_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.ronyx_invoices(id) on delete cascade,
  ticket_id uuid references public.aggregate_tickets(id) on delete set null,
  description text,
  quantity numeric(12,2) default 0,
  unit text,
  unit_price numeric(12,2) default 0,
  total_amount numeric(12,2) default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ronyx_invoice_items_invoice_id on public.ronyx_invoice_items(invoice_id);
create index if not exists idx_ronyx_invoice_items_ticket_id on public.ronyx_invoice_items(ticket_id);

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
