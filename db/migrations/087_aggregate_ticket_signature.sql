-- Migration: Add digital signature + POD metadata to tickets
ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS digital_signature text,
  ADD COLUMN IF NOT EXISTS signature_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;
