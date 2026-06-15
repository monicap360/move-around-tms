-- Migration 110: QR token fields + scan log table
-- Adds Fast Scan™ QR code support to Ronyx field tickets

ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS qr_token           text,
  ADD COLUMN IF NOT EXISTS qr_url             text,
  ADD COLUMN IF NOT EXISTS qr_created_at      timestamptz,
  ADD COLUMN IF NOT EXISTS qr_created_by      text,
  ADD COLUMN IF NOT EXISTS qr_scan_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_qr_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_approved  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_signature_text text,
  ADD COLUMN IF NOT EXISTS customer_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_signed_name text,
  ADD COLUMN IF NOT EXISTS customer_notes     text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agg_tickets_qr_token
  ON public.aggregate_tickets(qr_token)
  WHERE qr_token IS NOT NULL;

-- QR scan audit log
CREATE TABLE IF NOT EXISTS qr_scan_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id        uuid REFERENCES public.aggregate_tickets(id) ON DELETE CASCADE,
  qr_token         text NOT NULL,
  scan_role        text,  -- 'office', 'driver', 'customer', 'unknown'
  scan_source      text DEFAULT 'qr_code',
  scanned_at       timestamptz DEFAULT now(),
  device_info      text,
  ip_address       text,
  action_taken     text, -- 'viewed', 'edited', 'approved', 'signed', 'voided'
  notes            text
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_log_ticket ON qr_scan_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_log_token  ON qr_scan_log(qr_token);
CREATE INDEX IF NOT EXISTS idx_qr_scan_log_at     ON qr_scan_log(scanned_at DESC);

ALTER TABLE qr_scan_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on qr_scan_log"
  ON qr_scan_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated select on qr_scan_log"
  ON qr_scan_log FOR SELECT USING (true);
