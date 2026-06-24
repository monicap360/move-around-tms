-- Migration 213: RLS hardening patch — enable RLS on 6 tables that were exposed
-- without row-level security. Applied manually on 2026-06-23; this migration
-- records the change and adds permissive authenticated policies where missing.

ALTER TABLE IF EXISTS public.ronyx_fmcsa_lookup_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schema_migrations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_connections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carrier_verification_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carrier_verification_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ronyx_integrations            ENABLE ROW LEVEL SECURITY;

-- schema_migrations is a tracking table — no policy needed (service-role only).
-- The other 5 need permissive policies so authenticated users can read/write.

create policy if not exists "auth_all_ronyx_fmcsa_lookup_log"
  on public.ronyx_fmcsa_lookup_log for all using (auth.role() = 'authenticated');

create policy if not exists "auth_all_integration_connections"
  on public.integration_connections for all using (auth.role() = 'authenticated');

create policy if not exists "auth_all_carrier_verification_snapshots"
  on public.carrier_verification_snapshots for all using (auth.role() = 'authenticated');

create policy if not exists "auth_all_carrier_verification_events"
  on public.carrier_verification_events for all using (auth.role() = 'authenticated');

create policy if not exists "auth_all_ronyx_integrations"
  on public.ronyx_integrations for all using (auth.role() = 'authenticated');
