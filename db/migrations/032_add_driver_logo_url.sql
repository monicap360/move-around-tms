-- Migration: Add logo_url column to drivers table for truck logo uploads
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS logo_url text;