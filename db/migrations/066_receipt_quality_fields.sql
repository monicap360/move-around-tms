-- Migration 066: Quality fields for material receipts

alter table public.material_receipts
  add column if not exists quality_notes text,
  add column if not exists quality_hold boolean default false,
  add column if not exists received_by text;
