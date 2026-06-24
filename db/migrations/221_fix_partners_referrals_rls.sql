-- Migration 221: Fix the ONE genuinely-locked table the app reads client-side.
-- `partners` had RLS ENABLED (mig 001 / ROLE_BASED_SETUP) but NO policy, so
-- authenticated users got zero rows (deny-all). It is read client-side in 12
-- files (role-auth, marketplace, owner dashboard, …) → must have a policy.
-- Permissive authenticated access matches the project convention (mig 213/214);
-- tighten to owner/admin-scoped later if desired.
--
-- NOTE: `referrals` and the other "rls_enabled_no_policy" tables flagged by the
-- security advisor (compliance_overrides, customer_dispatch_requirements,
-- customer_requirement_checks, deleted_drivers_archive, dispatch_import_rows,
-- dispatch_rmis_note_rules, document_access_log, document_provenance,
-- module_registry, ronyx_ticket_ocr_extractions, schema_migrations) are NOT
-- touched on purpose: none are queried client-side (verified), so they are
-- correctly LOCKED to the service role. Adding policies would weaken security
-- for no functional gain.

alter table if exists public.partners enable row level security;

drop policy if exists "auth_all_partners" on public.partners;
create policy "auth_all_partners"
  on public.partners for all using (auth.role() = 'authenticated');
