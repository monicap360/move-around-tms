-- Migration 056: add organization_id to dispatcher_ratings
alter table if exists dispatcher_ratings
  add column if not exists organization_id uuid;

create index if not exists idx_dispatcher_ratings_org
  on dispatcher_ratings(organization_id);
