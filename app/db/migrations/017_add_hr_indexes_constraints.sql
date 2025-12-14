-- ==================================================
-- Migration: HR matching indexes and constraints (drivers/driver_documents)
-- ==================================================

-- Enable trigram extension for fuzzy matching
create extension if not exists pg_trgm;

-- Add unique license number on drivers (optional but recommended for auto-linking)
alter table if exists public.drivers
  add column if not exists license_number text;

create unique index if not exists ux_drivers_license_number
  on public.drivers (license_number)
  where license_number is not null;

-- Fuzzy name matching index on drivers.name
create index if not exists idx_drivers_name_trgm
  on public.drivers using gin (name gin_trgm_ops);

-- Expiration lookup index exists from 013; ensure present (idempotent)
create index if not exists idx_driver_documents_expiration
  on public.driver_documents (expiration_date);

-- Optional dedup: same driver, same doc_type, same expiration date should be unique
-- Use a partial unique index to avoid NULL collisions
create unique index if not exists ux_driver_documents_dedup
  on public.driver_documents (driver_id, doc_type, expiration_date)
  where driver_id is not null and expiration_date is not null;
