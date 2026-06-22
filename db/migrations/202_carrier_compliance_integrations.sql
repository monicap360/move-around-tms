-- Migration 202: Carrier Compliance Integration Framework
-- Creates the provider-neutral tables for RMIS, SaferWatch, MyCarrierPortal.
-- CCB reads normalized_data — never vendor-specific fields directly.

-- ── integration_connections ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL,
  provider            text        NOT NULL CHECK (provider IN ('rmis','saferwatch','mycarrierportal')),
  status              text        NOT NULL DEFAULT 'disconnected'
                                  CHECK (status IN ('disconnected','connected','error','paused')),
  encrypted_credentials jsonb,
  settings            jsonb       DEFAULT '{}'::jsonb,
  last_sync_at        timestamptz,
  last_sync_status    text,
  last_sync_error     text,
  connected_by        uuid,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_org  ON public.integration_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_prov ON public.integration_connections(provider);

-- ── carrier_verification_snapshots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carrier_verification_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL,
  provider            text        NOT NULL,
  owner_operator_id   uuid,
  mc_number           text,
  dot_number          text,
  verification_status text        DEFAULT 'pending'
                                  CHECK (verification_status IN ('pending','clear','needs_attention','blocked','error')),
  authority_status    text,
  safety_status       text,
  insurance_status    text,
  raw_response        jsonb,
  normalized_data     jsonb,
  retrieved_by        uuid,
  retrieved_at        timestamptz DEFAULT now(),
  expires_at          timestamptz,
  approved_at         timestamptz,
  approved_by         uuid,
  notes               text
);

CREATE INDEX IF NOT EXISTS idx_cvs_org       ON public.carrier_verification_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_cvs_oo        ON public.carrier_verification_snapshots(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_cvs_mc        ON public.carrier_verification_snapshots(mc_number);
CREATE INDEX IF NOT EXISTS idx_cvs_dot       ON public.carrier_verification_snapshots(dot_number);
CREATE INDEX IF NOT EXISTS idx_cvs_retrieved ON public.carrier_verification_snapshots(retrieved_at DESC);

-- ── carrier_verification_events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carrier_verification_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL,
  owner_operator_id   uuid,
  provider            text        NOT NULL,
  event_type          text        NOT NULL,
  severity            text        CHECK (severity IN ('critical','high','medium','low','info')),
  title               text        NOT NULL,
  details             jsonb,
  source_snapshot_id  uuid        REFERENCES public.carrier_verification_snapshots(id) ON DELETE SET NULL,
  resolved_at         timestamptz,
  resolved_by         uuid,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cve_org ON public.carrier_verification_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_cve_oo  ON public.carrier_verification_events(owner_operator_id);
CREATE INDEX IF NOT EXISTS idx_cve_created ON public.carrier_verification_events(created_at DESC);

RAISE NOTICE 'Migration 202 complete — integration_connections, carrier_verification_snapshots, carrier_verification_events created.';
