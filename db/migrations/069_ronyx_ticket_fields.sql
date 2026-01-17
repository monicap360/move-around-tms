-- Migration 069: Ronyx ticket fields for dump truck operations

alter table public.aggregate_tickets
  add column if not exists driver_name text,
  add column if not exists truck_number text,
  add column if not exists trailer_number text,
  add column if not exists job_name text,
  add column if not exists pickup_location text,
  add column if not exists delivery_location text,
  add column if not exists load_type text,
  add column if not exists rate_type text,
  add column if not exists rate_amount numeric(12,2),
  add column if not exists ticket_notes text,
  add column if not exists payment_status text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists driver_settlement_reference text,
  add column if not exists odometer numeric(12,2),
  add column if not exists shift text,
  add column if not exists work_order_number text,
  add column if not exists ticket_image_url text,
  add column if not exists delivery_receipt_url text,
  add column if not exists pod_url text;

create index if not exists idx_agg_tickets_ticket_number on public.aggregate_tickets(ticket_number);
create index if not exists idx_agg_tickets_payment_status on public.aggregate_tickets(payment_status);
