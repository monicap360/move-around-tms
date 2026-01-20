-- Migration 053: Ticket validation status fields

alter table public.aggregate_tickets
  add column if not exists validation_status text,
  add column if not exists validation_score numeric(5,2),
  add column if not exists validation_errors jsonb;

create index if not exists idx_aggregate_tickets_validation_status
  on public.aggregate_tickets (validation_status);
