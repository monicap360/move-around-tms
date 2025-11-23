-- ==================================================
-- Migration: Add OCR and partner fields to aggregate_tickets
-- ==================================================

-- Add partner reference and OCR-related fields
alter table public.aggregate_tickets
  add column if not exists partner_id uuid references public.aggregate_partners(id) on delete set null,
  add column if not exists ocr_raw_text text,
  add column if not exists image_url text,
  add column if not exists ocr_confidence numeric(5,2),
  add column if not exists ocr_processed_at timestamp;

-- Create indexes for new fields
create index if not exists idx_aggregate_tickets_partner on public.aggregate_tickets(partner_id);
create index if not exists idx_aggregate_tickets_ocr_processed on public.aggregate_tickets(ocr_processed_at);

-- Update fleet_id column name (truck_id → fleet_id for consistency)
-- Note: Only run this if you want to rename the column
-- alter table public.aggregate_tickets rename column truck_id to fleet_id;

-- Comments
comment on column public.aggregate_tickets.partner_id is 'Reference to aggregate partner (supplier/quarry)';
comment on column public.aggregate_tickets.ocr_raw_text is 'Raw OCR text extracted from ticket image';
comment on column public.aggregate_tickets.image_url is 'URL to uploaded ticket image';
comment on column public.aggregate_tickets.ocr_confidence is 'Average OCR confidence score (0-100)';
comment on column public.aggregate_tickets.ocr_processed_at is 'Timestamp when OCR processing completed';
