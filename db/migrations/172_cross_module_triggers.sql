-- ============================================================
-- Migration 172: Cross-Module Integration Triggers
--               + Implementation Hub Schema
-- Purpose:
--   Connect dispatch → billing, dispatch → payroll,
--   maintenance → dispatch eligibility so data flows
--   automatically between modules without touching existing tables.
--
-- All statements use IF NOT EXISTS / CREATE OR REPLACE.
--   Safe to re-run.
--
-- New tables (additive only):
--   ronyx_billing_queue     — tickets ready to invoice
--   ronyx_implementation_sessions — onboarding progress per org
--
-- New columns (additive only):
--   ronyx_trucks.dispatch_eligible boolean
--
-- Triggers (do not modify existing tables):
--   trg_ticket_to_billing   — aggregate_tickets → ronyx_billing_queue
--   trg_ticket_to_payroll   — aggregate_tickets → payroll_items
--   trg_maintenance_hold    — maintenance_requests Critical → truck hold
-- ============================================================


-- ------------------------------------------------------------
-- 1. Add dispatch_eligible to ronyx_trucks
--    (used by maintenance trigger to block unsafe trucks)
-- ------------------------------------------------------------
ALTER TABLE public.ronyx_trucks
  ADD COLUMN IF NOT EXISTS dispatch_eligible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS dispatch_hold_reason text,
  ADD COLUMN IF NOT EXISTS dispatch_held_at timestamptz;


-- ------------------------------------------------------------
-- 2. ronyx_billing_queue
--    Staging table: tickets that have been pushed to billing.
--    Invoicing page reads this to generate ronyx_invoices.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ronyx_billing_queue (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         uuid    UNIQUE,           -- prevents duplicate queue entries per ticket
  ticket_number     text,
  driver_name       text,
  truck_number      text,
  job_name          text,
  ticket_date       date,
  amount            numeric(12,2),            -- total_bill from aggregate_tickets
  pay_amount        numeric(12,2),            -- total_pay (driver cost)
  organization_id   uuid    REFERENCES public.organizations(id) ON DELETE CASCADE,
  status            text    DEFAULT 'pending' CHECK (status IN ('pending','invoiced','void')),
  invoice_id        uuid,                     -- set when pushed into ronyx_invoices
  queued_at         timestamptz DEFAULT now(),
  processed_at      timestamptz,
  notes             text
);

CREATE INDEX IF NOT EXISTS idx_rbq_org        ON public.ronyx_billing_queue(organization_id);
CREATE INDEX IF NOT EXISTS idx_rbq_status     ON public.ronyx_billing_queue(status);
CREATE INDEX IF NOT EXISTS idx_rbq_ticket     ON public.ronyx_billing_queue(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rbq_queued     ON public.ronyx_billing_queue(queued_at DESC);

ALTER TABLE public.ronyx_billing_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rbq_select" ON public.ronyx_billing_queue;
DROP POLICY IF EXISTS "rbq_insert" ON public.ronyx_billing_queue;
DROP POLICY IF EXISTS "rbq_update" ON public.ronyx_billing_queue;

CREATE POLICY "rbq_select" ON public.ronyx_billing_queue
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "rbq_insert" ON public.ronyx_billing_queue
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());

CREATE POLICY "rbq_update" ON public.ronyx_billing_queue
  FOR UPDATE TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ------------------------------------------------------------
-- 3. ronyx_implementation_sessions
--    Tracks onboarding progress per org, per phase.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ronyx_implementation_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  phase           text NOT NULL CHECK (phase IN (
                    'company_profile',
                    'customers',
                    'drivers',
                    'trucks',
                    'owner_operators',
                    'historical_tickets'
                  )),
  status          text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete','error')),
  import_count    integer DEFAULT 0,
  error_count     integer DEFAULT 0,
  last_error      text,
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (organization_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_ris_org ON public.ronyx_implementation_sessions(organization_id);

ALTER TABLE public.ronyx_implementation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ris_select" ON public.ronyx_implementation_sessions;
DROP POLICY IF EXISTS "ris_all"    ON public.ronyx_implementation_sessions;

CREATE POLICY "ris_select" ON public.ronyx_implementation_sessions
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

CREATE POLICY "ris_all" ON public.ronyx_implementation_sessions
  FOR ALL TO authenticated
  USING     (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ============================================================
-- TRIGGER 1: Ticket → Billing Queue
--   Fires AFTER UPDATE on aggregate_tickets.
--   When status becomes 'sent_to_billing' or 'approved',
--   inserts a row into ronyx_billing_queue (once per ticket).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_ticket_to_billing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only act on the transition INTO billing-ready statuses
  IF NEW.status IN ('sent_to_billing', 'approved', 'matched') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('sent_to_billing', 'approved', 'matched'))
  THEN
    INSERT INTO public.ronyx_billing_queue (
      ticket_id,
      ticket_number,
      driver_name,
      truck_number,
      job_name,
      ticket_date,
      amount,
      pay_amount,
      organization_id,
      status
    )
    VALUES (
      NEW.id,
      NEW.ticket_number,
      NEW.driver_name,
      NEW.truck_number,
      NEW.job_name,
      NEW.ticket_date,
      COALESCE(NEW.total_bill, NEW.rate_amount, 0),
      COALESCE(NEW.total_pay, 0),
      NEW.organization_id,
      'pending'
    )
    ON CONFLICT (ticket_id) DO NOTHING;  -- never double-queue the same ticket
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_to_billing ON public.aggregate_tickets;
CREATE TRIGGER trg_ticket_to_billing
  AFTER UPDATE ON public.aggregate_tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_ticket_to_billing();


-- ============================================================
-- TRIGGER 2: Ticket → Payroll Items
--   Fires AFTER UPDATE on aggregate_tickets.
--   When status becomes 'sent_to_payroll',
--   creates a payroll_items row for the driver.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_ticket_to_payroll()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'sent_to_payroll' AND
     (OLD.status IS NULL OR OLD.status <> 'sent_to_payroll')
  THEN
    -- Only insert if we have enough data to create a meaningful record
    IF NEW.driver_id IS NOT NULL OR NEW.driver_name IS NOT NULL THEN
      INSERT INTO public.payroll_items (
        driver_id,
        driver_name,
        related_ticket_id,
        job_number,
        item_type,
        description,
        gross_amount,
        status,
        source,
        organization_id,
        pay_period_start,
        pay_period_end
      )
      VALUES (
        NEW.driver_id,
        COALESCE(NEW.driver_name, 'Unknown Driver'),
        NEW.id,
        NEW.ticket_number,
        'ticket_pay',
        COALESCE(
          'Ticket ' || NEW.ticket_number || ' — ' || COALESCE(NEW.job_name, NEW.material, 'Load'),
          'Ticket pay'
        ),
        COALESCE(NEW.total_pay, 0),
        'pending',
        'ticket_trigger',
        NEW.organization_id,
        NEW.ticket_date,
        NEW.ticket_date
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_to_payroll ON public.aggregate_tickets;
CREATE TRIGGER trg_ticket_to_payroll
  AFTER UPDATE ON public.aggregate_tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_ticket_to_payroll();


-- ============================================================
-- TRIGGER 3: Maintenance Critical → Dispatch Hold
--   Fires AFTER INSERT OR UPDATE on maintenance_requests.
--   When a Critical maintenance request is created and the
--   truck cannot be driven safely, sets dispatch_eligible=false
--   on the matching ronyx_trucks row.
--   When the request is Completed or Cancelled, restores eligibility.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_maintenance_to_dispatch_hold()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Apply hold: Critical + unsafe + active request
  IF NEW.priority = 'Critical' AND NEW.can_drive_safely = false AND
     NEW.status IN ('Pending','Acknowledged','Scheduled','In Progress')
  THEN
    UPDATE public.ronyx_trucks
    SET
      dispatch_eligible    = false,
      dispatch_hold_reason = 'Critical maintenance: ' || COALESCE(NEW.description, NEW.issue_type),
      dispatch_held_at     = now(),
      updated_at           = now()
    WHERE truck_number = NEW.truck_number
      AND (organization_id IS NULL OR organization_id = (
            SELECT organization_id FROM public.drivers WHERE id = NEW.driver_id LIMIT 1
          ));

  -- Release hold when maintenance is done
  ELSIF NEW.status IN ('Completed','Cancelled') AND
        (OLD.status IS NULL OR OLD.status NOT IN ('Completed','Cancelled'))
  THEN
    UPDATE public.ronyx_trucks
    SET
      dispatch_eligible    = true,
      dispatch_hold_reason = NULL,
      dispatch_held_at     = NULL,
      updated_at           = now()
    WHERE truck_number = NEW.truck_number
      AND dispatch_eligible = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_hold ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_hold
  AFTER INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_maintenance_to_dispatch_hold();


-- ============================================================
-- Enable Supabase Realtime on key cross-module tables
-- (so frontend can subscribe with supabase.channel())
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.aggregate_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ronyx_billing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;


-- ============================================================
-- Validation queries — run after migration to confirm
-- ============================================================

-- Check triggers exist
SELECT
  trigger_name,
  event_object_table AS "table",
  event_manipulation AS "event",
  action_timing AS "timing"
FROM information_schema.triggers
WHERE trigger_name IN (
  'trg_ticket_to_billing',
  'trg_ticket_to_payroll',
  'trg_maintenance_hold'
)
ORDER BY trigger_name;

-- Check new tables exist
SELECT table_name, 'exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ronyx_billing_queue','ronyx_implementation_sessions')
ORDER BY table_name;

-- Check ronyx_trucks now has dispatch_eligible
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ronyx_trucks'
  AND column_name IN ('dispatch_eligible','dispatch_hold_reason','dispatch_held_at')
ORDER BY column_name;
