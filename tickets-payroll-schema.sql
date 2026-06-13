-- ============================================================
-- RONYX TMS — Tickets & Payroll Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Ticket number sequence ────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

-- ── Fast Scan Uploads ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fast_scan_uploads (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url                text NOT NULL,
  file_name               text,
  file_type               text,                        -- 'image', 'pdf', 'receipt', 'form'
  upload_status           text NOT NULL DEFAULT 'pending', -- 'pending','processing','reviewed','linked','rejected'
  scan_type               text,                        -- 'trip_proof','receipt','damage','no_show','complaint','fuel','toll','parking','other'
  detected_job_id         uuid,                        -- auto-detected from scan
  detected_driver_id      uuid,
  detected_vehicle        text,
  detected_amount         numeric(10,2),
  extracted_text          text,                        -- OCR result
  confidence_score        numeric(4,2),                -- 0-1
  -- Payroll
  creates_payroll_item    boolean DEFAULT false,
  payroll_action          text DEFAULT 'none',         -- 'none','create','hold','adjust','reimburse','release'
  related_payroll_item_id uuid,
  -- Links
  resulting_ticket_id     uuid,
  uploaded_by             text,
  reviewed_by             text,
  review_notes            text,
  created_at              timestamp with time zone DEFAULT now(),
  updated_at              timestamp with time zone DEFAULT now()
);

-- ── Tickets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number           text UNIQUE NOT NULL DEFAULT ('TKT-' || LPAD(nextval('ticket_number_seq')::text, 4, '0')),
  title                   text NOT NULL,
  description             text,
  category                text NOT NULL,               -- see TICKET_CATEGORIES below
  status                  text NOT NULL DEFAULT 'new', -- 'new','in_review','pending_info','escalated','on_hold','resolved','closed','rejected'
  priority                text NOT NULL DEFAULT 'medium', -- 'low','medium','high','critical'
  source                  text NOT NULL DEFAULT 'manual', -- 'manual','fast_scan','customer_complaint','system','driver_app'
  impact                  text[] DEFAULT '{}',         -- 'dispatch','payroll','billing','compliance','safety'

  -- Linked records
  related_job_id          uuid,
  related_driver_id       uuid,
  related_vehicle_id      text,
  related_wo_id           uuid,
  fast_scan_id            uuid REFERENCES fast_scan_uploads(id),
  scan_type               text,

  -- Payroll impact
  payroll_impact          boolean DEFAULT false,
  payroll_status          text DEFAULT 'none',         -- 'none','hold','pending_review','ready','approved'
  payroll_hold_reason     text,
  estimated_driver_pay    numeric(10,2),
  related_payroll_item_id uuid,

  -- Assignment & resolution
  assigned_to             text,
  due_date                date,
  resolved_at             timestamp with time zone,
  resolution_notes        text,
  created_by              text,
  created_at              timestamp with time zone DEFAULT now(),
  updated_at              timestamp with time zone DEFAULT now()
);

-- ── Ticket Comments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  body        text NOT NULL,
  author      text,
  is_internal boolean DEFAULT false,
  created_at  timestamp with time zone DEFAULT now()
);

-- ── Ticket Attachments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_url    text NOT NULL,
  file_name   text,
  file_type   text,
  uploaded_by text,
  created_at  timestamp with time zone DEFAULT now()
);

-- ── Payroll Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           uuid,
  driver_name         text,
  related_job_id      uuid,
  job_number          text,
  item_type           text NOT NULL,                   -- 'trip_pay','no_show_pay','bonus','deduction','reimbursement','adjustment'
  description         text NOT NULL,
  gross_amount        numeric(10,2) NOT NULL DEFAULT 0,
  net_amount          numeric(10,2),
  status              text NOT NULL DEFAULT 'pending', -- 'pending','hold','pending_approval','approved','paid','rejected'
  hold_reason         text,
  source              text DEFAULT 'manual',           -- 'manual','fast_scan','system','payroll_run'
  related_ticket_id   uuid REFERENCES tickets(id),
  related_scan_id     uuid REFERENCES fast_scan_uploads(id),
  manager_approved_by text,
  manager_approved_at timestamp with time zone,
  pay_period_start    date,
  pay_period_end      date,
  notes               text,
  created_by          text,
  created_at          timestamp with time zone DEFAULT now(),
  updated_at          timestamp with time zone DEFAULT now()
);

-- ── Payroll Adjustments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id uuid NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL,                       -- 'increase','decrease','override','cancel'
  old_amount      numeric(10,2),
  new_amount      numeric(10,2),
  reason          text NOT NULL,
  adjusted_by     text,
  created_at      timestamp with time zone DEFAULT now()
);

-- ── Payroll Holds ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_holds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id uuid NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  hold_reason     text NOT NULL,
  hold_type       text NOT NULL,                       -- 'missing_proof','incident','compliance','manager_review','dispute'
  held_by         text,
  released_by     text,
  released_at     timestamp with time zone,
  release_notes   text,
  created_at      timestamp with time zone DEFAULT now()
);

-- ── Fast Scan Results (parsed data per scan) ──────────────────
CREATE TABLE IF NOT EXISTS fast_scan_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         uuid NOT NULL REFERENCES fast_scan_uploads(id) ON DELETE CASCADE,
  field_name      text NOT NULL,
  field_value     text,
  confidence      numeric(4,2),
  source          text DEFAULT 'ocr',                  -- 'ocr','manual','system'
  created_at      timestamp with time zone DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_status         ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category       ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_related_job    ON tickets(related_job_id);
CREATE INDEX IF NOT EXISTS idx_tickets_related_driver ON tickets(related_driver_id);
CREATE INDEX IF NOT EXISTS idx_tickets_payroll_status ON tickets(payroll_status) WHERE payroll_impact = true;
CREATE INDEX IF NOT EXISTS idx_payroll_items_driver   ON payroll_items(driver_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_status   ON payroll_items(status);
CREATE INDEX IF NOT EXISTS idx_fast_scan_status       ON fast_scan_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);

-- ── Updated_at triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER trg_tickets_updated
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_payroll_items_updated
  BEFORE UPDATE ON payroll_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_fast_scan_updated
  BEFORE UPDATE ON fast_scan_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS (enable + allow service role) ────────────────────────
ALTER TABLE tickets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fast_scan_uploads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fast_scan_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_holds       ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- Add your own policies below for anon/authenticated roles if needed.
