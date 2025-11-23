-- ==================================================
-- Migration: RLS policies for public.notifications
-- ==================================================

alter table if exists public.notifications enable row level security;

-- Allow managers/owners/admins to read all notifications
create policy if not exists notifications_select_managers
  on public.notifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and lower(coalesce(ur.role, '')) in ('owner','admin','manager')
    )
  );

-- Optionally, allow drivers to read notifications tied to them if a mapping exists
-- This assumes a drivers table with an auth_user_id column; if not present, keep this commented out
-- create policy if not exists notifications_select_own
--   on public.notifications
--   for select
--   to authenticated
--   using (
--     exists (
--       select 1 from public.drivers d
--       where d.id = notifications.driver_id
--         and d.auth_user_id = auth.uid()
--     )
--   );

-- Do not allow inserts/updates/deletes from client roles; handled by triggers/cron/service role
-- (No policies created for those actions)
