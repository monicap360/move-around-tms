-- Migration 223: composite indexes for the hot ticket/dispatch paths at scale
-- (600 drivers + heavy ticket volume). All IF NOT EXISTS — idempotent, and also
-- backfills any single-column indexes the live DB may be missing (the migration
-- ledger only tracks 200-219, so earlier index migrations may not have applied).
--
-- Rationale: every ticket query is org-scoped (phase2 RLS filters
-- organization_id = current_user_org()) and then sorts/filters by another column.
-- A leading-organization_id composite serves "this org's tickets, by <col>" far
-- better than two separate single-column indexes.
--
-- Tables are small enough that plain CREATE INDEX (brief lock) is fine; no need
-- for CONCURRENTLY. Run anytime.

-- ── aggregate_tickets: org + (date | status | document_type) ─────────────────
create index if not exists idx_aggts_org_date
  on public.aggregate_tickets (organization_id, ticket_date desc);
create index if not exists idx_aggts_org_status
  on public.aggregate_tickets (organization_id, status);
create index if not exists idx_aggts_org_doctype
  on public.aggregate_tickets (organization_id, document_type);
-- backfill the core single-column indexes in case they never applied live
create index if not exists idx_aggts_org      on public.aggregate_tickets (organization_id);
create index if not exists idx_aggts_driver   on public.aggregate_tickets (driver_id);
create index if not exists idx_aggts_truck    on public.aggregate_tickets (truck_id);

-- ── drivers: org + status (dispatch eligibility per org) ─────────────────────
create index if not exists idx_drivers_org_status
  on public.drivers (organization_id, status);
create index if not exists idx_drivers_org_v223 on public.drivers (organization_id);

-- ── fast_scan_uploads: org + newest-first (upload review queues) ─────────────
create index if not exists idx_fsu_org_created
  on public.fast_scan_uploads (organization_id, created_at desc);

-- ── ronyx_tickets: org + (date | status) ─────────────────────────────────────
create index if not exists idx_ronyx_tickets_org_date
  on public.ronyx_tickets (organization_id, ticket_date desc);
create index if not exists idx_ronyx_tickets_org_status
  on public.ronyx_tickets (organization_id, status);

-- ── payroll_items: org + status (payroll runs over a period) ─────────────────
create index if not exists idx_payroll_items_org_status
  on public.payroll_items (organization_id, status);
