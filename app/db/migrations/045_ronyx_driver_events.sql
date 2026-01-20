-- Migration 045: Ronyx driver event log for real-time dashboard

create table if not exists public.ronyx_driver_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  driver_id text,
  truck_id text,
  load_id text,
  timestamp timestamptz not null,
  status_code text,
  note text,
  location jsonb,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_ronyx_driver_events_load_id
  on public.ronyx_driver_events(load_id);

create index if not exists idx_ronyx_driver_events_timestamp
  on public.ronyx_driver_events(timestamp desc);
