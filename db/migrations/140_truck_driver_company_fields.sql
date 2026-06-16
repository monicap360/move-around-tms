-- 140_truck_driver_company_fields.sql
-- Core rule: every driver AND every truck must be linked to a company/carrier.
-- This migration adds company/carrier identity columns to ronyx_trucks and
-- dispatch_jobs, and a match-confidence field for auto-resolution during import.

-- ── ronyx_trucks — company/carrier identity ────────────────────────────────
ALTER TABLE public.ronyx_trucks
  ADD COLUMN IF NOT EXISTS company_name           text,
  ADD COLUMN IF NOT EXISTS carrier_name           text,
  ADD COLUMN IF NOT EXISTS owner_operator_id      uuid REFERENCES public.ronyx_owner_operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_operator_name    text,
  ADD COLUMN IF NOT EXISTS assigned_driver_id     uuid,          -- FK to drivers.id (no FK constraint; driver table may vary)
  ADD COLUMN IF NOT EXISTS assigned_driver_name   text,
  ADD COLUMN IF NOT EXISTS company_match_status   text DEFAULT 'not_set';
  -- company_match_status: 'resolved' | 'needs_review' | 'not_set'

CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_company   ON public.ronyx_trucks(company_name);
CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_oo         ON public.ronyx_trucks(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_ronyx_trucks_driver     ON public.ronyx_trucks(assigned_driver_id);

-- ── dispatch_jobs — company/carrier visibility ─────────────────────────────
-- dispatch_jobs already has driver_name, truck_number, vendor_name.
-- Add company resolution fields so Dispatch Guard has full context.
ALTER TABLE public.dispatch_jobs
  ADD COLUMN IF NOT EXISTS company_name           text,
  ADD COLUMN IF NOT EXISTS carrier_name           text,
  ADD COLUMN IF NOT EXISTS owner_operator_id      uuid REFERENCES public.ronyx_owner_operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_operator_name    text,
  ADD COLUMN IF NOT EXISTS company_match_status   text DEFAULT 'not_set',
  ADD COLUMN IF NOT EXISTS company_match_source   text;
  -- match_source: 'truck_number' | 'driver_name' | 'driver_truck_pool' | 'vendor_name' | 'manual' | 'unresolved'

CREATE INDEX IF NOT EXISTS idx_dispatch_jobs_company ON public.dispatch_jobs(company_name);

-- ── drivers — ensure company fields exist (139 added these; safe to re-add) ─
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS company_name           text,
  ADD COLUMN IF NOT EXISTS carrier_name           text,
  ADD COLUMN IF NOT EXISTS employment_type        text DEFAULT 'W2 Driver',
  ADD COLUMN IF NOT EXISTS owner_operator_id      uuid REFERENCES public.ronyx_owner_operators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_operator_name    text;

-- ── driver_profiles — same ─────────────────────────────────────────────────
ALTER TABLE public.driver_profiles
  ADD COLUMN IF NOT EXISTS carrier_name           text,
  ADD COLUMN IF NOT EXISTS owner_operator_name    text;
