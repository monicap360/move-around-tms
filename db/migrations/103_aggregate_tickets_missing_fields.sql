-- Migration 103: Add missing columns to aggregate_tickets
-- These columns are referenced by the tickets API route but were never added
-- All statements use IF NOT EXISTS and are safe to re-run.

ALTER TABLE public.aggregate_tickets
  -- Generated ticket code (e.g. "TMS-20260614-001"), distinct from ticket_number
  ADD COLUMN IF NOT EXISTS ticket_id          text,

  -- Company / org
  ADD COLUMN IF NOT EXISTS company_name       text,
  ADD COLUMN IF NOT EXISTS project_id         uuid,
  ADD COLUMN IF NOT EXISTS customer_id        uuid,

  -- Source tracking
  ADD COLUMN IF NOT EXISTS source             text,

  -- GPS coordinates
  ADD COLUMN IF NOT EXISTS pickup_gps_lat     numeric(12,8),
  ADD COLUMN IF NOT EXISTS pickup_gps_lon     numeric(12,8),
  ADD COLUMN IF NOT EXISTS dump_gps_lat       numeric(12,8),
  ADD COLUMN IF NOT EXISTS dump_gps_lon       numeric(12,8),
  ADD COLUMN IF NOT EXISTS calculated_distance numeric(10,2),

  -- Location
  ADD COLUMN IF NOT EXISTS dump_location      text,

  -- Timing
  ADD COLUMN IF NOT EXISTS load_time          timestamptz,
  ADD COLUMN IF NOT EXISTS dump_time          timestamptz,
  ADD COLUMN IF NOT EXISTS waiting_minutes    int,

  -- Weight / volume
  ADD COLUMN IF NOT EXISTS load_weight        numeric(12,2),
  ADD COLUMN IF NOT EXISTS cubic_yards        numeric(12,2),
  ADD COLUMN IF NOT EXISTS load_count         int,
  ADD COLUMN IF NOT EXISTS weight_ticket_number text,

  -- Proof flags
  ADD COLUMN IF NOT EXISTS has_photo          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_signature      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS weight_ticket_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS documents_complete boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS driver_verified    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS truck_verified     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dispatch_match     boolean DEFAULT true,

  -- Surcharges
  ADD COLUMN IF NOT EXISTS fuel_surcharge_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS spread_amount      numeric(12,2),
  ADD COLUMN IF NOT EXISTS detention_amount   numeric(12,2),
  ADD COLUMN IF NOT EXISTS detention_ref      text,
  ADD COLUMN IF NOT EXISTS show_fuel          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_spread        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_detention     boolean DEFAULT false,

  -- Computed amounts (not generated cols — safe to set manually)
  ADD COLUMN IF NOT EXISTS total_amount       numeric(12,2),
  ADD COLUMN IF NOT EXISTS gross_amount       numeric(12,2),

  -- Payroll / billing workflow
  ADD COLUMN IF NOT EXISTS payroll_hold       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_hold       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_matched    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_matched    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payroll_status     text,

  -- CrossCheck / reconciliation
  ADD COLUMN IF NOT EXISTS crosscheck_status  text,
  ADD COLUMN IF NOT EXISTS weight_variance_pct numeric(8,4),
  ADD COLUMN IF NOT EXISTS weight_variance    numeric(8,4),
  ADD COLUMN IF NOT EXISTS variance_pct       numeric(8,4),

  -- Validation
  ADD COLUMN IF NOT EXISTS validation_status  text,
  ADD COLUMN IF NOT EXISTS validation_score   numeric(5,2),
  ADD COLUMN IF NOT EXISTS validation_errors  jsonb,

  -- client_name alias
  ADD COLUMN IF NOT EXISTS client_name        text,

  -- Additional location / load references
  ADD COLUMN IF NOT EXISTS plant              text,
  ADD COLUMN IF NOT EXISTS origin             text,
  ADD COLUMN IF NOT EXISTS jobsite            text,
  ADD COLUMN IF NOT EXISTS load_number        text,
  ADD COLUMN IF NOT EXISTS load_id            text,
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz DEFAULT now();

-- Index on ticket_id for fast lookups by generated code
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_ticket_id
  ON public.aggregate_tickets (ticket_id);

-- Index on source for filtering by scan type
CREATE INDEX IF NOT EXISTS idx_aggregate_tickets_source
  ON public.aggregate_tickets (source);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.set_aggregate_tickets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aggregate_tickets_updated_at ON public.aggregate_tickets;
CREATE TRIGGER trg_aggregate_tickets_updated_at
  BEFORE UPDATE ON public.aggregate_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_aggregate_tickets_updated_at();
