-- 198_ifta_command_center.sql
-- IFTA Command Center: filing periods, jurisdiction miles, fuel transactions,
-- tax rates, and per-quarter filing tasks.
-- Separate from legacy ifta_and_compliance_schema (migration 030) and
-- ifta_mileage_logs (migration 033) — those are aggregate/multi-org tables.
-- These tables are org-isolated and per-quarter.

-- ── IFTA Reporting Periods ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ifta_reporting_periods (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year                        integer     NOT NULL,
  quarter                     integer     NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  start_date                  date        NOT NULL,
  end_date                    date        NOT NULL,
  status                      text        NOT NULL DEFAULT 'open',
  readiness_percent           integer     NOT NULL DEFAULT 0 CHECK (readiness_percent BETWEEN 0 AND 100),
  locked_at                   timestamptz NULL,
  locked_by                   text        NULL,
  filed_at                    timestamptz NULL,
  filed_by                    text        NULL,
  filing_confirmation_number  text        NULL,
  filing_receipt_url          text        NULL,
  notes                       text        NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ifta_period_status CHECK (
    status IN ('open','in_progress','locked','filed','amended')
  ),
  CONSTRAINT uq_ifta_period_org_yr_q UNIQUE (organization_id, year, quarter)
);

-- ── IFTA Jurisdiction Miles ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ifta_jurisdiction_miles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id uuid        NULL REFERENCES public.ifta_reporting_periods(id) ON DELETE SET NULL,
  truck_id            uuid        NULL,
  driver_id           uuid        NULL,
  trip_id             text        NULL,
  trip_reference      text        NULL,
  date                date        NOT NULL,
  jurisdiction_code   char(2)     NOT NULL,
  gps_miles           numeric(10,3) NULL,
  dispatch_miles      numeric(10,3) NULL,
  actual_miles        numeric(10,3) NOT NULL DEFAULT 0,
  source              text        NOT NULL DEFAULT 'manual',
  verification_status text        NOT NULL DEFAULT 'needs_review',
  exception_reason    text        NULL,
  split_from_id       uuid        NULL,
  reviewed_by         text        NULL,
  reviewed_at         timestamptz NULL,
  notes               text        NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ijm_source CHECK (
    source IN ('eld_gps','dispatch_route','manual','imported_file','estimated_route')
  ),
  CONSTRAINT chk_ijm_status CHECK (
    verification_status IN ('verified','needs_review','missing_jurisdiction','mileage_conflict','manually_adjusted','excluded')
  )
);

-- ── IFTA Fuel Transactions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ifta_fuel_transactions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id uuid        NULL REFERENCES public.ifta_reporting_periods(id) ON DELETE SET NULL,
  truck_id            uuid        NULL,
  driver_id           uuid        NULL,
  transaction_date    date        NOT NULL,
  vendor_name         text        NULL,
  jurisdiction_code   char(2)     NULL,
  gallons             numeric(10,3) NOT NULL DEFAULT 0,
  total_cost          numeric(12,2) NULL,
  fuel_card_provider  text        NULL,
  source              text        NOT NULL DEFAULT 'manual',
  receipt_url         text        NULL,
  match_status        text        NOT NULL DEFAULT 'needs_truck_assignment',
  is_ifta_eligible    boolean     NOT NULL DEFAULT true,
  duplicate_of_id     uuid        NULL REFERENCES public.ifta_fuel_transactions(id),
  notes               text        NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ift_source CHECK (
    source IN ('fuel_card_efs','fuel_card_comdata','fuel_card_wex','fuel_card_fleet_one','manual','csv_import')
  ),
  CONSTRAINT chk_ift_match_status CHECK (
    match_status IN ('matched','needs_truck_assignment','needs_state_assignment','duplicate_suspected','missing_receipt','excluded','verified')
  )
);

-- ── IFTA Tax Rates ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ifta_tax_rates (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code  char(2)     NOT NULL,
  year               integer     NOT NULL,
  quarter            integer     NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  tax_rate           numeric(8,6) NOT NULL,
  effective_date     date        NOT NULL,
  source_reference   text        NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_ifta_tax_rate UNIQUE (jurisdiction_code, year, quarter)
);

-- ── IFTA Filing Tasks ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ifta_filing_tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id uuid        NOT NULL REFERENCES public.ifta_reporting_periods(id) ON DELETE CASCADE,
  task_key            text        NOT NULL,
  title               text        NOT NULL,
  description         text        NULL,
  status              text        NOT NULL DEFAULT 'not_started',
  owner_id            uuid        NULL,
  owner_name          text        NULL,
  due_date            date        NULL,
  impact_level        text        NOT NULL DEFAULT 'medium',
  notes               text        NULL,
  completed_at        timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_ifta_task_status CHECK (
    status IN ('not_started','in_progress','needs_review','blocked','ready','approved')
  ),
  CONSTRAINT chk_ifta_task_impact CHECK (
    impact_level IN ('critical','high','medium','low')
  ),
  CONSTRAINT uq_ifta_task_period_key UNIQUE (reporting_period_id, task_key)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ifta_period_org    ON public.ifta_reporting_periods(organization_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_ijm_org_period     ON public.ifta_jurisdiction_miles(organization_id, reporting_period_id);
CREATE INDEX IF NOT EXISTS idx_ijm_truck_date     ON public.ifta_jurisdiction_miles(truck_id, date);
CREATE INDEX IF NOT EXISTS idx_ijm_status         ON public.ifta_jurisdiction_miles(organization_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_ift_org_period     ON public.ifta_fuel_transactions(organization_id, reporting_period_id);
CREATE INDEX IF NOT EXISTS idx_ift_truck_date     ON public.ifta_fuel_transactions(truck_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_ift_match_status   ON public.ifta_fuel_transactions(organization_id, match_status);
CREATE INDEX IF NOT EXISTS idx_ifta_tasks_period  ON public.ifta_filing_tasks(reporting_period_id, status);

-- ── Updated-at triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_ifta_period_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ifta_period_updated_at ON public.ifta_reporting_periods;
CREATE TRIGGER trg_ifta_period_updated_at
  BEFORE UPDATE ON public.ifta_reporting_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_ifta_period_updated_at();

CREATE OR REPLACE FUNCTION public.set_ijm_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ijm_updated_at ON public.ifta_jurisdiction_miles;
CREATE TRIGGER trg_ijm_updated_at
  BEFORE UPDATE ON public.ifta_jurisdiction_miles
  FOR EACH ROW EXECUTE FUNCTION public.set_ijm_updated_at();

CREATE OR REPLACE FUNCTION public.set_ift_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ift_updated_at ON public.ifta_fuel_transactions;
CREATE TRIGGER trg_ift_updated_at
  BEFORE UPDATE ON public.ifta_fuel_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_ift_updated_at();

CREATE OR REPLACE FUNCTION public.set_ifta_task_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ifta_task_updated_at ON public.ifta_filing_tasks;
CREATE TRIGGER trg_ifta_task_updated_at
  BEFORE UPDATE ON public.ifta_filing_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_ifta_task_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.ifta_reporting_periods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_jurisdiction_miles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_fuel_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_tax_rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifta_filing_tasks       ENABLE ROW LEVEL SECURITY;

-- Tax rates are global reference data — readable by any authenticated user
CREATE POLICY "ifta_tax_rates_read_all" ON public.ifta_tax_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ifta_period_own_org" ON public.ifta_reporting_periods
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "ifta_jm_own_org" ON public.ifta_jurisdiction_miles
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "ifta_ft_own_org" ON public.ifta_fuel_transactions
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "ifta_tasks_own_org" ON public.ifta_filing_tasks
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));
