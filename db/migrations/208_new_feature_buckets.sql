-- Migration 208: Create storage buckets for the 15 tables added in migration 207.
-- Buckets were created manually via Supabase API on 2026-06-23.
-- This migration is for tracking purposes only.

-- Buckets created:
-- - branding
-- - intel-verify-queue
-- - intel-verify-audit
-- - dvir
-- - driver-layouts
-- - dispatch-messages
-- - plants
-- - scans
-- - job-postings
-- - jobs
-- - job-applications
-- - driver-incidents
-- - override-log
-- - violations
-- - safety-records

SELECT 1;
