-- Migration 226: add columns the dispatch-import code writes to dispatch_jobs but
-- that don't exist in the table (schema drift). The insert failed with
-- "Could not find the 'compliance_issue' column of 'dispatch_jobs'", which blocked
-- dispatch import + viewing. Non-destructive: only ADDs nullable columns.
-- Idempotent. Apply in the Supabase SQL editor.

-- self-bootstrap the ledger (see migration 225) so the final insert can't roll this back
create table if not exists public.schema_migrations (
  version    bigint primary key,
  name       text,
  applied_at timestamptz not null default now()
);

alter table if exists public.dispatch_jobs
  add column if not exists compliance_issue    text,
  add column if not exists compliance_severity text,
  add column if not exists dispatch_job_id     text;

insert into public.schema_migrations (version, name)
values (226, 'dispatch_jobs_missing_columns')
on conflict (version) do nothing;
