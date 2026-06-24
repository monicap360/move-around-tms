-- Migration 222: Close the two real security holes from the advisor's
-- "RLS Disabled in Public" finding. public.yards and public.payroll_weeks had
-- NO row-level security, so they were fully exposed through the anon/authenticated
-- PostgREST API. Neither is queried client-side (verified), so enabling RLS with
-- a service-role-only policy locks them down with zero functional impact —
-- server routes (service role) keep working; the public exposure is removed.
-- Matches the base-table convention from migration 001 (drivers/loads/payroll_entries).

alter table if exists public.yards         enable row level security;
alter table if exists public.payroll_weeks enable row level security;

drop policy if exists "Service role can access all yards" on public.yards;
create policy "Service role can access all yards"
  on public.yards for all to service_role using (true);

drop policy if exists "Service role can access all payroll_weeks" on public.payroll_weeks;
create policy "Service role can access all payroll_weeks"
  on public.payroll_weeks for all to service_role using (true);
