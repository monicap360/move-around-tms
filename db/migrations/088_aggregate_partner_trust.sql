-- Migration: Add trust tiers and tolerance multipliers to aggregate partners
ALTER TABLE public.aggregate_partners
  ADD COLUMN IF NOT EXISTS trust_level text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS tolerance_multiplier numeric(5,2) DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_aggregate_partners_trust
  ON public.aggregate_partners(trust_level);
