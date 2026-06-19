-- ============================================================
-- Migration 186: Payroll Calculation Engine (safe extension)
--
-- WHAT THIS DOES:
--   Extends the EXISTING ronyx_payroll_items backbone — does NOT
--   create a competing payroll system.  Touches:
--     1. ronyx_payroll_periods      — new: pay-cycle header rows
--     2. ronyx_payroll_items        — extend only (ADD COLUMN IF NOT EXISTS)
--     3. ronyx_payroll_validations  — new: per-item check results
--     4. ronyx_payroll_audit        — new: immutable audit trail
--     5. ronyx_rate_rules           — new: per-driver effective-dated rates
--     6. Triggers                   — lock protection, audit immutability,
--                                     ticket-change invalidation
--
-- DOES NOT TOUCH:
--   public.payroll, public.payroll_items, public.payroll_holds,
--   public.settlement_batches, public.settlement_items,
--   public.settlement_deductions, public.ronyx_payroll_rules
--
-- IDEMPOTENT: safe to re-run.  All statements use IF NOT EXISTS,
--   safe DROP CONSTRAINT IF EXISTS, and DROP TRIGGER IF EXISTS.
-- ============================================================


-- ─── 1. ronyx_payroll_periods ────────────────────────────────────────────────
-- One row per pay cycle.  Status flow: open → calculating → approved → locked → archived
-- Locked periods are immutable — no pay amounts may change.

CREATE TABLE IF NOT EXISTS public.ronyx_payroll_periods (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start          date          NOT NULL,
  period_end            date          NOT NULL,
  period_type           text          NOT NULL DEFAULT 'weekly'
    CHECK (period_type IN ('weekly','biweekly','semi_monthly','monthly','custom')),
  status                text          NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','calculating','approved','locked','archived')),
  -- Denormalized KPI totals (refreshed by engine after each run)
  total_gross_pay       numeric(14,2) NOT NULL DEFAULT 0,
  total_deductions      numeric(14,2) NOT NULL DEFAULT 0,
  total_reimbursements  numeric(14,2) NOT NULL DEFAULT 0,
  total_net_pay         numeric(14,2) NOT NULL DEFAULT 0,
  driver_count          integer       NOT NULL DEFAULT 0,
  ticket_count          integer       NOT NULL DEFAULT 0,
  items_ready           integer       NOT NULL DEFAULT 0,
  items_needing_review  integer       NOT NULL DEFAULT 0,
  -- Approval / lock metadata
  approved_by           text,
  approved_by_user_id   uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at           timestamptz,
  locked_by             text,
  locked_by_user_id     uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at             timestamptz,
  notes                 text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rpp_org_dates
  ON public.ronyx_payroll_periods(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_rpp_org_status
  ON public.ronyx_payroll_periods(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rpp_period_start
  ON public.ronyx_payroll_periods(period_start DESC);

ALTER TABLE public.ronyx_payroll_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpp_select" ON public.ronyx_payroll_periods;
DROP POLICY IF EXISTS "rpp_insert" ON public.ronyx_payroll_periods;
DROP POLICY IF EXISTS "rpp_update" ON public.ronyx_payroll_periods;
DROP POLICY IF EXISTS "rpp_delete" ON public.ronyx_payroll_periods;

CREATE POLICY "rpp_select" ON public.ronyx_payroll_periods
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "rpp_insert" ON public.ronyx_payroll_periods
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "rpp_update" ON public.ronyx_payroll_periods
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());
-- No delete policy — periods are archived, never deleted

DROP TRIGGER IF EXISTS set_updated_at_rpp ON public.ronyx_payroll_periods;
CREATE TRIGGER set_updated_at_rpp
  BEFORE UPDATE ON public.ronyx_payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 2. Extend ronyx_payroll_items ───────────────────────────────────────────
-- ronyx_payroll_items is the single calculated/payable item layer.
-- Only ADD COLUMN IF NOT EXISTS.  No existing rows or columns are altered.

-- Link to pay period header
ALTER TABLE public.ronyx_payroll_items
  ADD COLUMN IF NOT EXISTS period_id              uuid
    REFERENCES public.ronyx_payroll_periods(id) ON DELETE SET NULL;

-- Link to the rate rule that produced this calculation (for audit purposes)
ALTER TABLE public.ronyx_payroll_items
  ADD COLUMN IF NOT EXISTS rate_rule_id           uuid;
    -- No FK here intentionally: rate rules may be from ronyx_payroll_rules OR ronyx_rate_rules

-- Correction chain: if this item corrects a prior locked/paid item
ALTER TABLE public.ronyx_payroll_items
  ADD COLUMN IF NOT EXISTS correction_of_item_id  uuid
    REFERENCES public.ronyx_payroll_items(id) ON DELETE SET NULL;

-- ── Status constraint ────────────────────────────────────────────────────────
-- Safely drop ALL known old constraint names before adding the canonical one.
-- This covers: no existing constraint, migration-092 name, migration-173 name,
-- and any prior run of this migration.
ALTER TABLE public.ronyx_payroll_items DROP CONSTRAINT IF EXISTS rpi_status_check;
ALTER TABLE public.ronyx_payroll_items DROP CONSTRAINT IF EXISTS rpi_payroll_status_check;
ALTER TABLE public.ronyx_payroll_items DROP CONSTRAINT IF EXISTS ronyx_payroll_items_status_check;

ALTER TABLE public.ronyx_payroll_items
  ADD CONSTRAINT rpi_payroll_status_check
  CHECK (status IN (
    -- The 11 canonical engine statuses
    'draft',
    'waiting_for_ticket',
    'needs_review',
    'calculated',
    'approved',
    'recalculation_required',
    'payroll_hold',
    'ready_to_pay',
    'paid',
    'locked',
    'voided',
    'corrected',
    -- Legacy values from prior migrations (must be preserved)
    'pending',
    'regular',
    'overtime',
    'bonus',
    'deduction'
  ));

-- ── Financial extension fields ───────────────────────────────────────────────
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS reimbursements    numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS advances          numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS fuel_deduction    numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS overtime_pay      numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS bonus             numeric(12,2) NOT NULL DEFAULT 0;

-- ── Ticket tracking ──────────────────────────────────────────────────────────
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS ticket_count      integer       NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS missing_tickets   integer       NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS disputed_tickets  integer       NOT NULL DEFAULT 0;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS fast_scan_matched integer       NOT NULL DEFAULT 0;

-- ── Driver / pay metadata ────────────────────────────────────────────────────
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS pay_type_detail   text;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS driver_type       text;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS truck_number      text;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS company_name      text;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS period_start      date;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS period_end        date;

-- ── Validation / hold ────────────────────────────────────────────────────────
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS validation_flags  jsonb   NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS validation_errors text[];
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS hold_reason       text;

-- ── Source change tracking ───────────────────────────────────────────────────
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS last_trigger_source text;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS calculated_at    timestamptz;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS approved_by      text;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.ronyx_payroll_items ADD COLUMN IF NOT EXISTS approved_at      timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rpi_period_id      ON public.ronyx_payroll_items(period_id);
CREATE INDEX IF NOT EXISTS idx_rpi_period_dates   ON public.ronyx_payroll_items(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_rpi_driver_status  ON public.ronyx_payroll_items(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_rpi_correction     ON public.ronyx_payroll_items(correction_of_item_id)
  WHERE correction_of_item_id IS NOT NULL;


-- ─── 3. Lock-protection trigger on ronyx_payroll_items ───────────────────────
-- Safeguard 5: Locked or paid items cannot have pay amounts silently changed.
-- Only 'corrected' or 'voided' status transitions are permitted after lock.
-- All other changes must go through a correction record.

CREATE OR REPLACE FUNCTION public.protect_locked_payroll_items()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('locked', 'paid') THEN
    -- Block any change to monetary fields
    IF (NEW.gross_pay    IS DISTINCT FROM OLD.gross_pay    OR
        NEW.net_pay      IS DISTINCT FROM OLD.net_pay      OR
        NEW.deductions   IS DISTINCT FROM OLD.deductions   OR
        NEW.reimbursements IS DISTINCT FROM OLD.reimbursements OR
        NEW.advances     IS DISTINCT FROM OLD.advances     OR
        NEW.fuel_deduction IS DISTINCT FROM OLD.fuel_deduction) THEN
      RAISE EXCEPTION
        'ronyx_payroll_items: pay amounts on a % item (id=%) cannot be changed directly. '
        'Create a correction record (correction_of_item_id) instead.',
        OLD.status, OLD.id;
    END IF;
    -- Block status transitions that would lose the lock
    IF NEW.status NOT IN ('locked', 'paid', 'corrected', 'voided') THEN
      RAISE EXCEPTION
        'ronyx_payroll_items: cannot move a % item (id=%) to status %. '
        'Only corrected or voided transitions are allowed.',
        OLD.status, OLD.id, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_locked_payroll ON public.ronyx_payroll_items;
CREATE TRIGGER trg_protect_locked_payroll
  BEFORE UPDATE ON public.ronyx_payroll_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_payroll_items();


-- ─── 4. ronyx_payroll_validations ────────────────────────────────────────────
-- Per-item results for each of the 11 engine validation checks.
-- Replaced entirely on each engine run for a given item.

CREATE TABLE IF NOT EXISTS public.ronyx_payroll_validations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_item_id   uuid        NOT NULL REFERENCES public.ronyx_payroll_items(id) ON DELETE CASCADE,
  check_name        text        NOT NULL,
  passed            boolean     NOT NULL DEFAULT false,
  detail            text,
  severity          text        NOT NULL DEFAULT 'error'
    CHECK (severity IN ('error','warning','info')),
  evaluated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rpv_item    ON public.ronyx_payroll_validations(payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_rpv_org     ON public.ronyx_payroll_validations(organization_id);
CREATE INDEX IF NOT EXISTS idx_rpv_check   ON public.ronyx_payroll_validations(check_name, passed);

ALTER TABLE public.ronyx_payroll_validations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpv_select" ON public.ronyx_payroll_validations;
DROP POLICY IF EXISTS "rpv_insert" ON public.ronyx_payroll_validations;
DROP POLICY IF EXISTS "rpv_update" ON public.ronyx_payroll_validations;
DROP POLICY IF EXISTS "rpv_delete" ON public.ronyx_payroll_validations;

CREATE POLICY "rpv_select" ON public.ronyx_payroll_validations
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "rpv_insert" ON public.ronyx_payroll_validations
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
-- Only allow delete (for engine refresh), not update — stale rows are replaced
CREATE POLICY "rpv_delete" ON public.ronyx_payroll_validations
  FOR DELETE TO authenticated USING (organization_id = public.current_user_org());


-- ─── 5. ronyx_payroll_audit ──────────────────────────────────────────────────
-- Immutable append-only audit trail.
-- Engine writes one row for every status change, recalculation, approval, lock,
-- void, correction, hold, or manual edit.
-- Records store: user_id, timestamp, reason, before-value, after-value.

CREATE TABLE IF NOT EXISTS public.ronyx_payroll_audit (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payroll_item_id   uuid,       -- nullable: period-level events have no item
  period_id         uuid,
  driver_id         uuid,
  driver_name       text,
  event_type        text        NOT NULL
    CHECK (event_type IN (
      'status_change','recalculation','approval','lock','unlock',
      'void','correction','hold','manual_edit','engine_run'
    )),
  from_status       text,
  to_status         text,
  trigger_source    text        -- ticket | dispatch | rate_change | fast_scan | manual | system
    CHECK (trigger_source IN ('ticket','dispatch','rate_change','fast_scan','deduction','reimbursement','manual','system') OR trigger_source IS NULL),
  trigger_ref       uuid,       -- FK id of the triggering record (ticket, dispatch, etc.)
  old_values        jsonb,      -- pay amounts, status, and fields BEFORE change
  new_values        jsonb,      -- pay amounts, status, and fields AFTER change
  notes             text,
  performed_by      text        NOT NULL DEFAULT 'system',
  performed_by_user_id uuid     REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
  -- NO updated_at — audit rows are never updated
);

CREATE INDEX IF NOT EXISTS idx_rpa_item   ON public.ronyx_payroll_audit(payroll_item_id);
CREATE INDEX IF NOT EXISTS idx_rpa_period ON public.ronyx_payroll_audit(period_id);
CREATE INDEX IF NOT EXISTS idx_rpa_driver ON public.ronyx_payroll_audit(driver_id);
CREATE INDEX IF NOT EXISTS idx_rpa_org_ts ON public.ronyx_payroll_audit(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rpa_event  ON public.ronyx_payroll_audit(event_type, created_at DESC);

ALTER TABLE public.ronyx_payroll_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rpa_select" ON public.ronyx_payroll_audit;
DROP POLICY IF EXISTS "rpa_insert" ON public.ronyx_payroll_audit;

CREATE POLICY "rpa_select" ON public.ronyx_payroll_audit
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "rpa_insert" ON public.ronyx_payroll_audit
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
-- Explicitly NO update policy, NO delete policy — immutable by design

-- Trigger enforces immutability at the DB level (belt + suspenders)
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ronyx_payroll_audit is immutable — no updates or deletes are permitted on audit rows (id=%)', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_payroll_audit ON public.ronyx_payroll_audit;
CREATE TRIGGER trg_immutable_payroll_audit
  BEFORE UPDATE OR DELETE ON public.ronyx_payroll_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();


-- ─── 6. ronyx_rate_rules ─────────────────────────────────────────────────────
-- Per-driver effective-dated pay rates.
-- Safe to create — ronyx_payroll_rules (migration 092) stores pay_type + pay_rate
-- per driver and is the EXISTING table.  This table adds effective dates,
-- material type, customer scope, and conflict prevention.
-- The engine queries BOTH tables as fallback.

CREATE TABLE IF NOT EXISTS public.ronyx_rate_rules (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id           uuid        NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  -- Scope (null = applies to all)
  material_type       text,
  customer_id         uuid,
  project_id          uuid,
  truck_number        text,
  -- Pay configuration
  pay_type            text        NOT NULL DEFAULT 'per_ton'
    CHECK (pay_type IN ('per_ton','per_load','per_hour','percent_of_revenue','flat_rate','daily_rate')),
  pay_rate            numeric(10,4) NOT NULL DEFAULT 0
    CHECK (pay_rate >= 0),
  minimum_pay         numeric(10,2)
    CHECK (minimum_pay IS NULL OR minimum_pay >= 0),
  fuel_surcharge_pct  numeric(5,4) DEFAULT 0,
  spread_pct          numeric(5,4) DEFAULT 0,
  -- Effective date window
  effective_from      date        NOT NULL DEFAULT CURRENT_DATE,
  effective_to        date,
  CONSTRAINT rrr_date_order CHECK (effective_to IS NULL OR effective_to > effective_from),
  is_active           boolean     NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Prevent two open-ended active rules for the same driver + pay_type + scope.
-- Rules with an effective_to date may overlap (historical records are valid).
CREATE UNIQUE INDEX IF NOT EXISTS idx_rrr_no_open_overlap
  ON public.ronyx_rate_rules(driver_id, pay_type, COALESCE(material_type,'*'), COALESCE(truck_number,'*'))
  WHERE is_active = true AND effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_rrr_driver_active ON public.ronyx_rate_rules(driver_id, is_active, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_rrr_org           ON public.ronyx_rate_rules(organization_id);

ALTER TABLE public.ronyx_rate_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rrr_select" ON public.ronyx_rate_rules;
DROP POLICY IF EXISTS "rrr_insert" ON public.ronyx_rate_rules;
DROP POLICY IF EXISTS "rrr_update" ON public.ronyx_rate_rules;
DROP POLICY IF EXISTS "rrr_delete" ON public.ronyx_rate_rules;

CREATE POLICY "rrr_select" ON public.ronyx_rate_rules
  FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "rrr_insert" ON public.ronyx_rate_rules
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "rrr_update" ON public.ronyx_rate_rules
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "rrr_delete" ON public.ronyx_rate_rules
  FOR DELETE TO authenticated USING (organization_id = public.current_user_org());

DROP TRIGGER IF EXISTS set_updated_at_rrr ON public.ronyx_rate_rules;
CREATE TRIGGER set_updated_at_rrr
  BEFORE UPDATE ON public.ronyx_rate_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 7. Ticket-change invalidation trigger ───────────────────────────────────
-- Safeguard 8: When a ticket's driver, quantity, amount, status, or date changes,
-- mark the linked ronyx_payroll_items row as recalculation_required.
-- Never silently changes an approved, locked, or paid item's pay amounts.

CREATE OR REPLACE FUNCTION public.invalidate_payroll_on_ticket_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only act if a pay-relevant field changed
  IF (OLD.driver_id       IS DISTINCT FROM NEW.driver_id       OR
      OLD.quantity        IS DISTINCT FROM NEW.quantity        OR
      OLD.total_amount    IS DISTINCT FROM NEW.total_amount    OR
      OLD.total_pay       IS DISTINCT FROM NEW.total_pay       OR
      OLD.status          IS DISTINCT FROM NEW.status          OR
      OLD.ticket_date     IS DISTINCT FROM NEW.ticket_date) THEN

    UPDATE public.ronyx_payroll_items pi
    SET
      status               = 'recalculation_required',
      last_trigger_source  = 'ticket'
    WHERE
      pi.driver_id = COALESCE(NEW.driver_id, OLD.driver_id)
      -- Match tickets that fall within this item's pay period
      AND pi.period_start IS NOT NULL
      AND pi.period_end   IS NOT NULL
      AND COALESCE(NEW.ticket_date, OLD.ticket_date) BETWEEN pi.period_start AND pi.period_end
      -- Never silently alter locked or paid items
      AND pi.status NOT IN ('locked', 'paid');
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to aggregate_tickets (the primary operational ticket table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'aggregate_tickets'
  ) THEN
    DROP TRIGGER IF EXISTS trg_invalidate_payroll_ticket ON public.aggregate_tickets;
    CREATE TRIGGER trg_invalidate_payroll_ticket
      AFTER UPDATE ON public.aggregate_tickets
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_payroll_on_ticket_change();
  END IF;
END;
$$;

-- Apply to fast_scan_documents as well (status changes there also affect payroll)
CREATE OR REPLACE FUNCTION public.invalidate_payroll_on_scan_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.scan_status  IS DISTINCT FROM NEW.scan_status  OR
      OLD.driver_name  IS DISTINCT FROM NEW.driver_name  OR
      OLD.ticket_number IS DISTINCT FROM NEW.ticket_number) THEN
    -- Mark the driver's open payroll item as recalculation_required
    -- We match on driver_name (text) since fast_scan_documents has no driver_id FK
    UPDATE public.ronyx_payroll_items pi
    SET
      status              = 'recalculation_required',
      last_trigger_source = 'fast_scan'
    WHERE
      pi.driver_name = COALESCE(NEW.driver_name, OLD.driver_name)
      AND pi.status NOT IN ('locked', 'paid');
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fast_scan_documents'
  ) THEN
    DROP TRIGGER IF EXISTS trg_invalidate_payroll_scan ON public.fast_scan_documents;
    CREATE TRIGGER trg_invalidate_payroll_scan
      AFTER UPDATE ON public.fast_scan_documents
      FOR EACH ROW EXECUTE FUNCTION public.invalidate_payroll_on_scan_change();
  END IF;
END;
$$;


-- ─── 8. Verify ───────────────────────────────────────────────────────────────
SELECT
  t.table_name,
  CASE WHEN t.table_name IN (
    'ronyx_payroll_periods','ronyx_payroll_validations',
    'ronyx_payroll_audit','ronyx_rate_rules'
  ) THEN 'created by this migration'
  ELSE 'pre-existing (extended)' END AS origin
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'ronyx_payroll_periods',
    'ronyx_payroll_items',
    'ronyx_payroll_validations',
    'ronyx_payroll_audit',
    'ronyx_rate_rules',
    'payroll_items',
    'payroll_holds'
  )
ORDER BY t.table_name;
