-- Migration 105: Add voided/void workflow columns missing from migration 021
-- All IF NOT EXISTS — safe to re-run even if some columns already exist.

ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS voided                 boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS voided_at              timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by            text,
  ADD COLUMN IF NOT EXISTS approved_at            timestamptz,
  ADD COLUMN IF NOT EXISTS is_missing_ticket      boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS missing_ticket_reason  text,
  ADD COLUMN IF NOT EXISTS target_week_start      date,
  ADD COLUMN IF NOT EXISTS target_week_end        date,
  ADD COLUMN IF NOT EXISTS csv_reconciled         boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS csv_match_details      jsonb;

-- Partial index for fast void lookups
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_voided
  ON public.aggregate_tickets (voided)
  WHERE voided = TRUE;

-- Now that voided exists, re-create the voided_by partial index correctly
DROP INDEX IF EXISTS idx_aggregate_tickets_voided_by;
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_voided_by
  ON public.aggregate_tickets (voided_by)
  WHERE voided = TRUE;
