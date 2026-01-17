-- Migration: Add master match fields to reconciliation results
ALTER TABLE public.aggregate_reconciliation_results
  ADD COLUMN IF NOT EXISTS master_load_id uuid references public.aggregate_master_loads(id) on delete set null,
  ADD COLUMN IF NOT EXISTS match_method text,
  ADD COLUMN IF NOT EXISTS match_confidence numeric(5,2),
  ADD COLUMN IF NOT EXISTS match_key text;

CREATE INDEX IF NOT EXISTS idx_agg_recon_results_master
  ON public.aggregate_reconciliation_results(master_load_id);
