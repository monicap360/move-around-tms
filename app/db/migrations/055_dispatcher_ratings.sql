-- Migration 055: Dispatcher ratings for drivers
create table if not exists dispatcher_ratings (
  id uuid primary key default gen_random_uuid(),
  driver_uuid text not null,
  score smallint not null check (score between 1 and 5),
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dispatcher_ratings_driver_uuid
  on dispatcher_ratings(driver_uuid);
