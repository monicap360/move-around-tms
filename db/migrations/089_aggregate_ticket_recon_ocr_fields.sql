-- Migration: Ensure recon + OCR fields exist on aggregate_tickets
ALTER TABLE public.aggregate_tickets
  ADD COLUMN IF NOT EXISTS recon_gross numeric(12,2),
  ADD COLUMN IF NOT EXISTS recon_tare numeric(12,2),
  ADD COLUMN IF NOT EXISTS recon_net numeric(12,2),
  ADD COLUMN IF NOT EXISTS recon_material text,
  ADD COLUMN IF NOT EXISTS recon_plant text,
  ADD COLUMN IF NOT EXISTS recon_matched_by text,
  ADD COLUMN IF NOT EXISTS recon_status text,
  ADD COLUMN IF NOT EXISTS ocr_json jsonb,
  ADD COLUMN IF NOT EXISTS ocr_fields_confidence jsonb;
