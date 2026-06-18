-- Migration 160: Structured address fields for owner_operators
-- Replaces/supplements the single business_address text column with
-- separate line1, line2, city, state, zip fields for both company
-- and mailing addresses. Existing business_address data is preserved.

ALTER TABLE public.owner_operators
  ADD COLUMN IF NOT EXISTS company_address_line1   text,
  ADD COLUMN IF NOT EXISTS company_address_line2   text,
  ADD COLUMN IF NOT EXISTS company_city            text,
  ADD COLUMN IF NOT EXISTS company_state           text,
  ADD COLUMN IF NOT EXISTS company_zip             text,
  ADD COLUMN IF NOT EXISTS company_country         text DEFAULT 'USA',
  ADD COLUMN IF NOT EXISTS mailing_same_as_company boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mailing_address_line1   text,
  ADD COLUMN IF NOT EXISTS mailing_address_line2   text,
  ADD COLUMN IF NOT EXISTS mailing_city            text,
  ADD COLUMN IF NOT EXISTS mailing_state           text,
  ADD COLUMN IF NOT EXISTS mailing_zip             text,
  ADD COLUMN IF NOT EXISTS mailing_country         text DEFAULT 'USA',
  ADD COLUMN IF NOT EXISTS dispatch_blocked_override   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_hold_override    boolean NOT NULL DEFAULT false;

-- Index for fast lookups by state (useful for regional filtering)
CREATE INDEX IF NOT EXISTS idx_oo_company_state ON public.owner_operators (company_state);
CREATE INDEX IF NOT EXISTS idx_oo_dispatch_blocked ON public.owner_operators (dispatch_blocked_override) WHERE dispatch_blocked_override = true;
CREATE INDEX IF NOT EXISTS idx_oo_settlement_hold  ON public.owner_operators (settlement_hold_override)  WHERE settlement_hold_override  = true;
