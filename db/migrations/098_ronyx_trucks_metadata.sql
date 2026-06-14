-- Migration: Add optional metadata fields to Ronyx trucks
ALTER TABLE public.ronyx_trucks
  ADD COLUMN IF NOT EXISTS truck_type text,
  ADD COLUMN IF NOT EXISTS plate text,
  ADD COLUMN IF NOT EXISTS odometer integer;
