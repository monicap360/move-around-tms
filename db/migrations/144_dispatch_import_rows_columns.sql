-- Migration 144: Add intelligence columns to dispatch_jobs for pre-dispatch review
-- These columns store the result of client-side analysis and DB matching
-- so staff can see match quality, RMIS classification, and expected tickets
-- on each imported row without re-running analysis.

alter table dispatch_jobs
  add column if not exists matched_company_name       text,
  add column if not exists matched_owner_operator_id  uuid references owner_operators(id) on delete set null,
  add column if not exists match_confidence           numeric(5,2),
  add column if not exists rmis_classification        text,
  add column if not exists rmis_severity              text,
  add column if not exists customer_requirement_status text,
  add column if not exists dispatch_guard_status      text,
  add column if not exists expected_ticket_count      integer default 0,
  add column if not exists expected_time_proof        boolean default false,
  add column if not exists row_status                 text default 'needs_review',
  add column if not exists next_best_action           text;

-- Indexes for filtering by status in the post-import board
create index if not exists idx_dispatch_jobs_row_status
  on dispatch_jobs(row_status);

create index if not exists idx_dispatch_jobs_dispatch_guard_status
  on dispatch_jobs(dispatch_guard_status);

-- Optional: also add a dispatch_import_rows table if the operation needs
-- a separate staging layer before promotion to dispatch_jobs.
-- For now the columns above on dispatch_jobs are sufficient.
