-- ============================================================================
-- Capacity Network — candidate lifecycle backend (Phase 1 spine).
-- Turns the driver marketplace into a hiring pipeline: Saved → Unlocked → Contacted
-- → Interested → Screening → Compliance → Offer → Ready to Dispatch → Hired.
-- Safe to re-run (IF NOT EXISTS). Run in the Supabase SQL editor.
-- ============================================================================

-- One row per candidate a company is working (driver or owner-operator).
CREATE TABLE IF NOT EXISTS network_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  candidate_type text DEFAULT 'driver',          -- 'driver' | 'owner_operator'
  candidate_ref text,                            -- anonymous_driver_id or OO id
  display_name text,                             -- revealed after unlock
  pipeline_status text DEFAULT 'saved',          -- saved/unlocked/contacted/interested/screening/compliance_review/offer/ready_to_dispatch/hired/not_a_fit
  assigned_to text,                              -- recruiter/dispatcher/staff name
  match_score int,                               -- 0-100 transparent match
  match_reasons jsonb,                           -- {equipment:true, area:true, ...}
  service_area text, equipment text, pay_range text, notes text,
  last_contacted_at timestamptz, due_at timestamptz, next_task text,
  unlocked_at timestamptz, hired_at timestamptz,
  converted_driver_id uuid, converted_oo_id uuid,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- Conversation / internal note log per candidate.
CREATE TABLE IF NOT EXISTS network_candidate_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  candidate_id uuid, note text, note_type text DEFAULT 'note',  -- note/call/text/email/task
  created_by text, created_at timestamptz DEFAULT now()
);

-- "Request Capacity" — describe the need; system returns a ranked shortlist.
CREATE TABLE IF NOT EXISTS capacity_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  need_type text,                                -- 'driver' | 'owner_operator' | 'both'
  equipment text, service_area text, radius_miles int, start_date date,
  shift text, material text, job_duration text, endorsements text,
  required_documents text, rate_range text, count_needed int DEFAULT 1,
  status text DEFAULT 'open', notes text,
  created_by text, created_at timestamptz DEFAULT now()
);

-- Verification facts (specific, dated — not a blanket "verified" badge).
CREATE TABLE IF NOT EXISTS candidate_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  candidate_id uuid, candidate_ref text,
  verification_type text,                        -- identity/document/employment/reference/company_approved
  detail text, source text, verified_on date, expires_on date,
  consent_status text, created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_netcand_org ON network_candidates(organization_id, pipeline_status);
CREATE INDEX IF NOT EXISTS idx_netcand_ref ON network_candidates(organization_id, candidate_ref);
CREATE INDEX IF NOT EXISTS idx_netnotes_cand ON network_candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_caprequests_org ON capacity_requests(organization_id, status);

NOTIFY pgrst, 'reload schema';
