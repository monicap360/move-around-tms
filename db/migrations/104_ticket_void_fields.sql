-- Migration 104: Add voided_by and void_reason columns for deletion audit trail
-- Migration 021 already added voided + voided_at; this adds who and why.

ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS voided_by   text,
  ADD COLUMN IF NOT EXISTS void_reason text;

CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_voided_by
  ON public.aggregate_tickets (voided_by)
  WHERE voided = TRUE;
