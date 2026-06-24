-- Migration 219: Tier-4 reconciliation (decisions confirmed 2026-06-24).
--   • trucks = canonical fleet entity; aggregate_tickets.truck_id re-pointed
--     fleets(id) → trucks(id).  (orphan truck_ids = 0 in live, validates clean.)
--   • aggregate_tickets policy stack de-duplicated: drop the redundant
--     "org_isolation" (overlaps the phase2_* org-scoped CRUD set). KEEP the
--     phase2_* policies and the admin policy (admins retain cross-org access).
--   • trucks read tightened: replace "All can view trucks" (USING true) with an
--     org-scoped SELECT; admin-manage policy left intact (covers admins cross-org).
--
-- LIVE vs REBUILD ordering note: phase2_aggregate_tickets_* and is_admin() are
-- LIVE-ONLY (not yet in the repo). On live they already exist, so this migration
-- is correct as-is. For a clean rebuild they must be created by the companion
-- CAPTURE migration BEFORE this one — see [[project_profiles_schema_divergence]]
-- follow-up / the views+policies capture migration.

-- ── 1. FK re-point: aggregate_tickets.truck_id → trucks(id) ──────────────────
alter table public.aggregate_tickets drop constraint if exists aggregate_tickets_truck_id_fkey;
alter table public.aggregate_tickets
  add constraint aggregate_tickets_truck_id_fkey
  foreign key (truck_id) references public.trucks(id) on delete set null not valid;
alter table public.aggregate_tickets validate constraint aggregate_tickets_truck_id_fkey;

-- ── 2. aggregate_tickets policy de-duplication ──────────────────────────────
-- Drop ONLY the redundant org_isolation (phase2_*_org already enforce org CRUD).
-- phase2_aggregate_tickets_{select,insert,update,delete}_org and the admin
-- policy ("Admins full access on tickets") are intentionally KEPT.
drop policy if exists "org_isolation" on public.aggregate_tickets;

-- ── 3. trucks read tightening ───────────────────────────────────────────────
-- Remove world-readable SELECT; replace with org-scoped read. Admin-manage
-- policy ("Admins can manage trucks", ALL) is left intact for cross-org admins.
drop policy if exists "All can view trucks" on public.trucks;
drop policy if exists "trucks_org_select" on public.trucks;
create policy "trucks_org_select" on public.trucks
  for select using (organization_id = current_user_org());
