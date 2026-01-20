-- Migration 048: Dispute fields for settlement items

alter table public.driver_settlement_items
  add column if not exists dispute_type text,
  add column if not exists driver_proposed_value numeric(10,2);
