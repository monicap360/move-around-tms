-- Migration 145: dispatch_import_rows staging table + dispatch_rmis_note_rules
--
-- dispatch_import_rows: stores every CSV row with full intelligence metadata
--   BEFORE it is promoted to dispatch_jobs.  Staff review happens here.
-- dispatch_rmis_note_rules: DB-managed RMIS note patterns so ops staff can
--   add/update rules without a code deploy.

-- ── dispatch_import_rows ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispatch_import_rows (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_import_id          uuid REFERENCES public.dispatch_imports(id) ON DELETE CASCADE,
  organization_id             uuid,

  -- Raw source (never mutated)
  raw_row                     jsonb NOT NULL,

  -- Parsed CSV fields
  driver_name                 text,
  truck_number                text,
  customer_name               text,
  start_time                  timestamptz,
  pickup_site_name            text,
  dropoff_site_name           text,
  job_quantity                numeric,
  job_quantity_unit           text,
  material                    text,
  friendly_job_id             text,
  vendor_name                 text,
  equipment_license_number    text,
  job_status                  text,

  -- RMIS classification (from dispatch_rmis_note_rules)
  rmis_note                   text,
  rmis_classification         text,   -- Clear | Needs Document Upload | Needs Staff Review | Dispatch Block | RMIS Follow-Up | Unknown Note
  rmis_severity               text,   -- clear | low | warning | critical
  rmis_meaning                text,
  rmis_action                 text,
  rmis_task                   text,

  -- DB match results
  matched_driver_id           uuid,
  matched_driver_company      text,
  matched_truck_id            uuid,
  matched_owner_operator      text,
  match_confidence            numeric(5,2),
  match_status                text,   -- matched | missing_company | unknown_driver | unknown_truck | conflict | needs_review

  -- Intelligence outputs
  expected_ticket_count       integer DEFAULT 0,
  expected_time_proof         boolean DEFAULT false,
  row_status                  text DEFAULT 'needs_review',  -- ready | needs_review | critical
  next_best_action            text,
  issues                      text[],

  -- Customer requirement result
  customer_requirement_status text DEFAULT 'pending',  -- ready | needs_review | blocked | pending

  -- Dispatch Guard pre-import decision
  dispatch_guard_status       text DEFAULT 'pending',  -- ready | needs_review | blocked | pending

  -- Promotion tracking
  promoted_to_job_id          uuid,
  promoted_at                 timestamptz,

  created_at                  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dir_import        ON public.dispatch_import_rows(dispatch_import_id);
CREATE INDEX IF NOT EXISTS idx_dir_row_status    ON public.dispatch_import_rows(row_status);
CREATE INDEX IF NOT EXISTS idx_dir_driver        ON public.dispatch_import_rows(driver_name);
CREATE INDEX IF NOT EXISTS idx_dir_truck         ON public.dispatch_import_rows(truck_number);
CREATE INDEX IF NOT EXISTS idx_dir_guard_status  ON public.dispatch_import_rows(dispatch_guard_status);


-- ── dispatch_rmis_note_rules ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispatch_rmis_note_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,            -- NULL = global rule visible to all orgs
  pattern         text NOT NULL,   -- case-insensitive regex (POSIX)
  classification  text NOT NULL,   -- Clear | Needs Document Upload | Needs Staff Review | Dispatch Block | RMIS Follow-Up | Unknown Note
  severity        text NOT NULL,   -- clear | low | warning | critical
  meaning         text,
  action          text,
  task            text,            -- staff task label to auto-create
  priority        integer DEFAULT 100,  -- checked ascending; first match wins
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmis_rules_priority ON public.dispatch_rmis_note_rules(priority) WHERE is_active = true;

-- ── Seed global RMIS rules ──────────────────────────────────────────────────
INSERT INTO public.dispatch_rmis_note_rules
  (pattern, classification, severity, meaning, action, task, priority)
VALUES
  ('^$',                          'Clear',                'clear',    'No RMIS note — standard dispatch.',                         NULL,                                                     NULL,                                                                   1),
  ('^standard$',                  'Clear',                'clear',    'Standard RMIS note — no compliance action needed.',          NULL,                                                     NULL,                                                                   2),
  ('have dl.{0,4}medical.{0,4}inspection', 'Clear',      'low',      'Driver has DL, Medical Card, and Inspection confirmed.',     'Verify inspection date is current.',                     NULL,                                                                  10),
  ('have dl.{0,4}medical',        'Clear',                'low',      'DL and Medical Card confirmed — Inspection may be missing.', 'Request DOT inspection document.',                       'Driver Coordinator: Request inspection document',                     20),
  ('request.{0,5}dl',             'Needs Document Upload','warning',  'Driver''s License was requested but not received.',          'Follow up with driver for DL copy.',                     'Driver Coordinator: Request DL copy from driver',                     30),
  ('missing.{0,10}medical',       'Dispatch Block',       'critical', 'Medical Certificate is missing from RMIS.',                  'Block dispatch until Medical Card is uploaded.',          'Compliance Admin: Upload Medical Certificate — DISPATCH BLOCKED',     40),
  ('missing.{0,10}back.{0,10}dl', 'Needs Document Upload','warning',  'Back of driver''s license not on RMIS file.',               'Request back of DL from driver.',                        'Driver Coordinator: Request back of DL',                              50),
  ('uncertified',                 'Dispatch Block',       'critical', 'Driver is uncertified on RMIS.',                            'Block dispatch until RMIS certification is resolved.',    'Compliance Admin: Resolve RMIS uncertified status — DISPATCH BLOCKED',60),
  ('email.{0,5}(and|&|\+).{0,5}call', 'RMIS Follow-Up', 'warning',  'RMIS requires email and phone follow-up for documents.',     'Email and call driver or company for missing docs.',      'Compliance Admin: Email & call for documents',                        70),
  ('email.{0,5}for.{0,5}docs',   'RMIS Follow-Up',       'warning',  'RMIS requires email for missing documents.',                 'Email driver or company for missing documents.',          'Compliance Admin: Email for documents',                               80),
  ('missing',                     'Needs Document Upload','warning',  'RMIS notes a missing document.',                            'Review and request missing document from driver.',        'Driver Coordinator: Review and request missing document',             90)
ON CONFLICT DO NOTHING;
