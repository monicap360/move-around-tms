-- Migration 228: CCB Phase 1 — monitoring settings + clearance reviews
-- Additive only. Reuses the existing FMCSA data model:
--   carrier_verification_snapshots = the FMCSA check audit history (do NOT duplicate)
--   carrier_verification_events    = change alerts
-- This migration adds the two pieces that did NOT already exist:
--   1) carrier_monitoring_settings — schedule a carrier for later automatic checks
--   2) carrier_clearance_reviews   — staff approve/block/override decisions, separate from raw FMCSA data
-- Convention: organization_id (matches 239 existing tables). owner_operator_id mirrors
-- carrier_verification_snapshots.owner_operator_id (no FK, same as that table). RLS enabled,
-- no policies → server-side service-role access only (matches migration 213 posture).

-- ── carrier_monitoring_settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carrier_monitoring_settings (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid        NOT NULL,
  owner_operator_id         uuid        NOT NULL,
  is_enabled                boolean     NOT NULL DEFAULT true,
  monitor_authority         boolean     NOT NULL DEFAULT true,
  monitor_safety            boolean     NOT NULL DEFAULT true,
  monitor_insurance_filings boolean     NOT NULL DEFAULT false,
  check_frequency           text        NOT NULL DEFAULT 'daily'
                                        CHECK (check_frequency IN ('daily','weekly','monthly')),
  last_checked_at           timestamptz,
  next_check_at             timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, owner_operator_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_org        ON public.carrier_monitoring_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_cms_oo         ON public.carrier_monitoring_settings(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_cms_next_check ON public.carrier_monitoring_settings(next_check_at)
                                              WHERE is_enabled = true;

-- ── carrier_clearance_reviews ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carrier_clearance_reviews (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL,
  owner_operator_id uuid        NOT NULL,
  status            text        NOT NULL DEFAULT 'needs_review'
                                CHECK (status IN ('clear','needs_review','blocked','expired','pending_verification')),
  reason            text,
  approved_by       uuid,
  approved_at       timestamptz,
  expires_at        timestamptz,
  override_reason   text,
  override_by       uuid,
  override_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccr_org    ON public.carrier_clearance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccr_oo     ON public.carrier_clearance_reviews(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_ccr_status ON public.carrier_clearance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_ccr_org_oo_created ON public.carrier_clearance_reviews(organization_id, owner_operator_id, created_at DESC);

-- ── RLS: enabled, no policies (server-side service-role only — matches 213) ──
ALTER TABLE public.carrier_monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_clearance_reviews   ENABLE ROW LEVEL SECURITY;
