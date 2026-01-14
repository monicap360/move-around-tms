-- Migration 059: Add organization setup fields used by Quick Start Wizard

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS mc_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS zip text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS truck_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trailer_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Chicago',
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS enable_mexican_compliance boolean DEFAULT false;

