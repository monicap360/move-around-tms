-- ============================================================
-- Migration 180: AccuriScale Intelligence™ — Rules, Tolerances & ROI Settings
--
-- Creates validation rules, company tolerance settings, and
-- ROI calculator defaults.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================


-- ─── 1. accuriscale_rules ─────────────────────────────────────────────────────
-- Global or org-level validation rules that drive exception detection.

CREATE TABLE IF NOT EXISTS public.accuriscale_rules (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NULL organization_id = global default rule (applies to all orgs)
  rule_key              text          NOT NULL,
  rule_name             text          NOT NULL,
  rule_description      text,
  exception_type        text          NOT NULL
    CHECK (exception_type IN (
      'short_load','missing_ticket','duplicate_ticket','weight_mismatch',
      'driver_mismatch','truck_mismatch','material_mismatch','rate_mismatch',
      'manual_override','payroll_hold','billing_hold','unbilled_ticket',
      'unmatched_ticket','missing_proof','scale_edit_detected','other'
    )),
  severity              text          NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info','warning','critical','block')),
  is_active             boolean       NOT NULL DEFAULT true,
  auto_hold_payroll     boolean       NOT NULL DEFAULT false,
  auto_hold_billing     boolean       NOT NULL DEFAULT false,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_asr_org    ON public.accuriscale_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_asr_active ON public.accuriscale_rules(is_active);

ALTER TABLE public.accuriscale_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asr_select" ON public.accuriscale_rules;
DROP POLICY IF EXISTS "asr_insert" ON public.accuriscale_rules;
DROP POLICY IF EXISTS "asr_update" ON public.accuriscale_rules;
CREATE POLICY "asr_select" ON public.accuriscale_rules FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id = public.current_user_org());
CREATE POLICY "asr_insert" ON public.accuriscale_rules FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asr_update" ON public.accuriscale_rules FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org())
  WITH CHECK (organization_id = public.current_user_org());


-- ─── 2. accuriscale_tolerance_settings ───────────────────────────────────────
-- Per-org weight/rate tolerance thresholds.

CREATE TABLE IF NOT EXISTS public.accuriscale_tolerance_settings (
  id                            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               uuid          NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  weight_variance_percent       numeric(5,2)  NOT NULL DEFAULT 3.0,   -- e.g. 3% tolerance
  weight_variance_tons          numeric(10,3) NOT NULL DEFAULT 1.0,   -- absolute tons tolerance
  rate_variance_percent         numeric(5,2)  NOT NULL DEFAULT 0.0,   -- 0 = exact match required
  allow_manual_override         boolean       NOT NULL DEFAULT true,
  require_override_reason       boolean       NOT NULL DEFAULT true,
  duplicate_ticket_window_days  integer       NOT NULL DEFAULT 30,
  auto_match_confidence_min     integer       NOT NULL DEFAULT 80,    -- min score to auto-match
  short_load_threshold_percent  numeric(5,2)  NOT NULL DEFAULT 90.0,  -- below 90% of expected = short load
  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.accuriscale_tolerance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asts_select" ON public.accuriscale_tolerance_settings;
DROP POLICY IF EXISTS "asts_insert" ON public.accuriscale_tolerance_settings;
DROP POLICY IF EXISTS "asts_update" ON public.accuriscale_tolerance_settings;
CREATE POLICY "asts_select" ON public.accuriscale_tolerance_settings FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asts_insert" ON public.accuriscale_tolerance_settings FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asts_update" ON public.accuriscale_tolerance_settings FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 3. accuriscale_roi_settings ─────────────────────────────────────────────
-- Per-org ROI calculator defaults (powers the dashboard ROI widget).

CREATE TABLE IF NOT EXISTS public.accuriscale_roi_settings (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 uuid          NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  loads_per_day                   integer       NOT NULL DEFAULT 45,
  average_value_per_load          numeric(10,2) NOT NULL DEFAULT 420.00,
  discrepancy_percent             numeric(5,2)  NOT NULL DEFAULT 4.0,
  reconciliation_hours_per_day    numeric(5,2)  NOT NULL DEFAULT 2.0,
  admin_hourly_rate               numeric(8,2)  NOT NULL DEFAULT 30.00,
  missed_accessorial_percent      numeric(5,2)  NOT NULL DEFAULT 2.0,
  working_days_per_year           integer       NOT NULL DEFAULT 260,
  created_at                      timestamptz   NOT NULL DEFAULT now(),
  updated_at                      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.accuriscale_roi_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asrs_select" ON public.accuriscale_roi_settings;
DROP POLICY IF EXISTS "asrs_insert" ON public.accuriscale_roi_settings;
DROP POLICY IF EXISTS "asrs_update" ON public.accuriscale_roi_settings;
CREATE POLICY "asrs_select" ON public.accuriscale_roi_settings FOR SELECT TO authenticated USING (organization_id = public.current_user_org());
CREATE POLICY "asrs_insert" ON public.accuriscale_roi_settings FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_org());
CREATE POLICY "asrs_update" ON public.accuriscale_roi_settings FOR UPDATE TO authenticated USING (organization_id = public.current_user_org()) WITH CHECK (organization_id = public.current_user_org());


-- ─── 4. Global default rules (no organization_id = applies everywhere) ────────

INSERT INTO public.accuriscale_rules (organization_id, rule_key, rule_name, rule_description, exception_type, severity, auto_hold_payroll, auto_hold_billing)
VALUES
  (NULL, 'rule_duplicate_ticket',         'Flag Duplicate Ticket Number',        'Same ticket number submitted more than once within the lookback window.',            'duplicate_ticket',       'critical', true,  true),
  (NULL, 'rule_ticket_no_load',           'Flag Ticket with No Load',            'Scale ticket uploaded but no matching dispatch load found.',                        'missing_ticket',         'critical', true,  true),
  (NULL, 'rule_load_no_ticket',           'Flag Load with No Ticket',            'Dispatch load exists but no scale ticket has been uploaded or matched.',            'unmatched_ticket',       'critical', true,  true),
  (NULL, 'rule_tons_variance',            'Flag Tons Variance Over Tolerance',   'Actual tons differ from expected tons beyond the configured tolerance.',             'weight_mismatch',        'warning',  true,  false),
  (NULL, 'rule_rate_mismatch',            'Flag Customer Rate Mismatch',         'Invoiced rate does not match the contracted customer rate on file.',                 'rate_mismatch',          'critical', false, true),
  (NULL, 'rule_driver_pay_mismatch',      'Flag Driver Pay Rate Mismatch',       'Payroll pay rate does not match driver contract rate.',                             'rate_mismatch',          'warning',  true,  false),
  (NULL, 'rule_ticket_paid_not_billed',   'Flag Ticket Paid But Not Billed',     'Driver was paid for a ticket that has not been invoiced to the customer.',          'unbilled_ticket',        'critical', false, true),
  (NULL, 'rule_ticket_billed_not_paid',   'Flag Ticket Billed But Driver Not Paid','Customer was invoiced but driver payroll line is missing.',                       'missing_proof',          'warning',  true,  false),
  (NULL, 'rule_short_load',               'Flag Short Load',                     'Actual tons are below the short-load threshold vs expected tons.',                  'short_load',             'critical', true,  true),
  (NULL, 'rule_manual_override',          'Flag Manual Scale Override',          'Scale weight was manually overridden. Requires supervisor review.',                  'scale_edit_detected',    'warning',  false, false),
  (NULL, 'rule_driver_mismatch',          'Flag Driver / Ticket Mismatch',       'Driver on scale ticket does not match the driver assigned in dispatch.',            'driver_mismatch',        'warning',  true,  false),
  (NULL, 'rule_material_mismatch',        'Flag Material Mismatch',              'Material on scale ticket does not match the material on the dispatch job.',          'material_mismatch',      'warning',  true,  true)
ON CONFLICT (organization_id, rule_key) DO UPDATE SET
  is_active    = EXCLUDED.is_active,
  severity     = EXCLUDED.severity,
  updated_at   = now();


-- ─── Validate ────────────────────────────────────────────────────────────────

SELECT table_name, 'created' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'accuriscale_rules',
    'accuriscale_tolerance_settings',
    'accuriscale_roi_settings'
  )
ORDER BY table_name;

SELECT rule_key, rule_name, severity, auto_hold_payroll, auto_hold_billing
FROM public.accuriscale_rules
WHERE organization_id IS NULL
ORDER BY rule_key;
