-- 194_rate_cards_and_aux_charges.sql
-- Rate Card Center: named rate cards with per-rule pricing logic.
-- Auxiliary Charges: per-job/ticket extras (fuel surcharge, detention, etc.)

-- ── Rate Cards ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organization_rate_cards (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text        NULL,
  customer_name   text        NULL,
  effective_date  date        NULL,
  expires_date    date        NULL,
  is_default      boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_orc_name CHECK (char_length(name) BETWEEN 1 AND 120)
);

CREATE TABLE IF NOT EXISTS public.organization_rate_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rate_card_id    uuid        NULL REFERENCES public.organization_rate_cards(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  rate_type       text        NOT NULL,
  material        text        NULL,
  customer_name   text        NULL,
  project_name    text        NULL,
  pit_name        text        NULL,
  zone            text        NULL,
  amount          numeric(12,4) NOT NULL DEFAULT 0,
  unit            text        NOT NULL DEFAULT 'load',
  min_amount      numeric(12,4) NULL,
  min_unit        text        NULL,
  fuel_surcharge_pct numeric(6,4) NULL,
  applies_to      text        NOT NULL DEFAULT 'both',
  is_active       boolean     NOT NULL DEFAULT true,
  priority        integer     NOT NULL DEFAULT 0,
  notes           text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_orr_rate_type CHECK (
    rate_type IN (
      'per_load','per_ton','per_mile','per_hour','per_trip',
      'per_material','per_zone','customer_rate','contractor_rate',
      'driver_pay','owner_operator_split','fuel_surcharge',
      'minimum_load','after_hours','emergency','base_rate'
    )
  ),
  CONSTRAINT chk_orr_unit CHECK (
    unit IN ('load','ton','mile','hour','trip','day','pct','flat')
  ),
  CONSTRAINT chk_orr_applies_to CHECK (
    applies_to IN ('billing','payroll','both')
  )
);

CREATE INDEX IF NOT EXISTS idx_orc_org    ON public.organization_rate_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_orc_active ON public.organization_rate_cards(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orr_card   ON public.organization_rate_rules(rate_card_id);
CREATE INDEX IF NOT EXISTS idx_orr_org    ON public.organization_rate_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_orr_type   ON public.organization_rate_rules(organization_id, rate_type);

CREATE OR REPLACE FUNCTION public.set_orc_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_orc_updated_at ON public.organization_rate_cards;
CREATE TRIGGER trg_orc_updated_at BEFORE UPDATE ON public.organization_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_orc_updated_at();

CREATE OR REPLACE FUNCTION public.set_orr_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_orr_updated_at ON public.organization_rate_rules;
CREATE TRIGGER trg_orr_updated_at BEFORE UPDATE ON public.organization_rate_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_orr_updated_at();

ALTER TABLE public.organization_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_rate_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orc_all_own_org" ON public.organization_rate_cards
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "orr_all_own_org" ON public.organization_rate_rules
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

-- ── Auxiliary Charges ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ronyx_auxiliary_charges (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          uuid        NULL,
  ticket_id       uuid        NULL,
  charge_type     text        NOT NULL,
  label           text        NOT NULL,
  amount          numeric(12,2) NOT NULL DEFAULT 0,
  unit            text        NOT NULL DEFAULT 'flat',
  bill_customer   boolean     NOT NULL DEFAULT true,
  pay_contractor  boolean     NOT NULL DEFAULT false,
  approval_required boolean   NOT NULL DEFAULT false,
  approved_by     text        NULL,
  approved_at     timestamptz NULL,
  reason          text        NULL,
  proof_url       text        NULL,
  status          text        NOT NULL DEFAULT 'pending',
  created_by      text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_rac_charge_type CHECK (
    charge_type IN (
      'fuel_surcharge','wait_time','detention','toll','after_hours','night_shift',
      'weekend','mobilization','demobilization','standby','extra_stop',
      'equipment_fee','washout','scale_fee','disposal','other'
    )
  ),
  CONSTRAINT chk_rac_unit CHECK (
    unit IN ('flat','per_hour','per_mile','per_load','pct')
  ),
  CONSTRAINT chk_rac_status CHECK (
    status IN ('pending','approved','rejected','billed','paid')
  )
);

CREATE INDEX IF NOT EXISTS idx_rac_org    ON public.ronyx_auxiliary_charges(organization_id);
CREATE INDEX IF NOT EXISTS idx_rac_job    ON public.ronyx_auxiliary_charges(job_id);
CREATE INDEX IF NOT EXISTS idx_rac_ticket ON public.ronyx_auxiliary_charges(ticket_id);
CREATE INDEX IF NOT EXISTS idx_rac_status ON public.ronyx_auxiliary_charges(organization_id, status);

CREATE OR REPLACE FUNCTION public.set_rac_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_rac_updated_at ON public.ronyx_auxiliary_charges;
CREATE TRIGGER trg_rac_updated_at BEFORE UPDATE ON public.ronyx_auxiliary_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_rac_updated_at();

ALTER TABLE public.ronyx_auxiliary_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rac_all_own_org" ON public.ronyx_auxiliary_charges
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));

-- ── Ticket Change Log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ticket_change_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NULL,
  ticket_id       text        NOT NULL,
  ticket_no       text        NULL,
  field_name      text        NOT NULL,
  old_value       text        NULL,
  new_value       text        NULL,
  changed_by      text        NULL,
  change_reason   text        NULL,
  payroll_impact  text        NULL,
  billing_impact  text        NULL,
  requires_approval boolean   NOT NULL DEFAULT false,
  approved_by     text        NULL,
  approved_at     timestamptz NULL,
  approval_status text        NOT NULL DEFAULT 'not_required',
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_tcl_approval_status CHECK (
    approval_status IN ('not_required','pending','approved','rejected')
  )
);

CREATE INDEX IF NOT EXISTS idx_tcl_ticket   ON public.ticket_change_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tcl_org      ON public.ticket_change_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_tcl_created  ON public.ticket_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tcl_field    ON public.ticket_change_log(ticket_id, field_name);

ALTER TABLE public.ticket_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tcl_select_own_org" ON public.ticket_change_log FOR SELECT
  USING (
    organization_id IS NULL OR
    organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "tcl_insert_own_org" ON public.ticket_change_log FOR INSERT
  WITH CHECK (true);

-- ── Expected Tickets (Bulk Ticket Generator) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dispatch_expected_tickets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          uuid        NULL,
  job_number      text        NULL,
  ticket_number   text        NULL,
  driver_id       uuid        NULL,
  truck_id        uuid        NULL,
  customer_name   text        NULL,
  pickup_site     text        NULL,
  dropoff_site    text        NULL,
  material        text        NULL,
  quantity        numeric(10,3) NULL,
  quantity_unit   text        NULL DEFAULT 'load',
  rate            numeric(12,4) NULL,
  expected_at     timestamptz NULL,
  status          text        NOT NULL DEFAULT 'expected',
  matched_ticket_id text      NULL,
  matched_at      timestamptz NULL,
  notes           text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_det_status CHECK (
    status IN ('expected','matched','missing','cancelled','extra')
  )
);

CREATE INDEX IF NOT EXISTS idx_det_org    ON public.dispatch_expected_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_det_job    ON public.dispatch_expected_tickets(job_id);
CREATE INDEX IF NOT EXISTS idx_det_status ON public.dispatch_expected_tickets(organization_id, status);

CREATE OR REPLACE FUNCTION public.set_det_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_det_updated_at ON public.dispatch_expected_tickets;
CREATE TRIGGER trg_det_updated_at BEFORE UPDATE ON public.dispatch_expected_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_det_updated_at();

ALTER TABLE public.dispatch_expected_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "det_all_own_org" ON public.dispatch_expected_tickets
  USING (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.user_seats WHERE user_id = auth.uid() AND status = 'active'));
