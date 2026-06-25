-- Migration 225: close client-role (anon/authenticated) exposure surfaced by the
-- Supabase advisors. The app accesses Postgres as SERVICE ROLE (bypasses RLS), so
-- removing anon/authenticated access here does NOT affect app routes — it only
-- closes the direct PostgREST/GraphQL attack surface that bypasses the app layer.
--
-- This is a HARD PRE-REQUISITE for the RONYX_AUTH_REQUIRED=true cutover: until the
-- client-reachable tenant tables are zero, a logged-in user could read other
-- tenants' rows directly via the Supabase client. See RUNBOOK_AUTH_CUTOVER.md.
--
-- Idempotent. REVIEW the GraphQL + bucket sections against actual feature usage
-- before applying (see the VERIFY notes). Apply in the Supabase SQL editor.

-- ── 0. Ledger table (self-bootstrap) ────────────────────────────────────────
-- The repo's migrations record themselves in public.schema_migrations, but it was
-- never created — so the ledger insert at the end of every migration has been
-- failing, and (since the SQL editor runs the file as ONE transaction) rolling the
-- whole migration back. Create it FIRST, in this same transaction, so the final
-- insert succeeds and 225 actually persists.
create table if not exists public.schema_migrations (
  version    bigint primary key,
  name       text,
  applied_at timestamptz not null default now()
);

-- ── 1. SECURITY DEFINER helper callable by anon (advisor 0028) ───────────────
-- is_super_admin is a privilege check; anon should never call it.
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='is_super_admin') then
    revoke execute on function public.is_super_admin(uuid) from anon, public;
  end if;
end $$;

-- ── 2. Permissive USING true / WITH CHECK true policies for client roles ─────
-- (advisor 0024) on tenant tables. Drop them dynamically (no need to know policy
-- names). With RLS enabled and no client policy, anon/authenticated are denied;
-- service_role still bypasses RLS so the app is unaffected.
-- NOTE: these are the ADVISOR-NAMED tables. Extend this list from the targeted
-- "real-risk only" query (any anon/authenticated policy whose expr = 'true').
do $$
declare r record;
declare tbls text[] := array[
  'fleets','parts','rate_contracts','saved_reports',
  'title_transfers','scale_tickets','activation_payments'
];
begin
  for r in
    select pol.polname, cls.relname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace ns on ns.oid = cls.relnamespace and ns.nspname = 'public'
    join pg_roles rol on rol.oid = any(pol.polroles)
    where cls.relname = any(tbls)
      and rol.rolname in ('anon','authenticated','public')
      and (coalesce(pg_get_expr(pol.polqual,      pol.polrelid), '') = 'true'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') = 'true')
  loop
    execute format('drop policy if exists %I on public.%I', r.polname, r.relname);
    raise notice '225: dropped permissive policy % on %', r.polname, r.relname;
  end loop;

  -- Ensure RLS is on so the default is deny-for-client-roles (service_role bypasses).
  foreach r.relname in array tbls loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname=r.relname) then
      execute format('alter table public.%I enable row level security', r.relname);
    end if;
  end loop;
end $$;
-- If a CLIENT feature legitimately needs to read one of these tables, do NOT
-- restore USING true — add an org-scoped policy instead, e.g.:
--   create policy fleets_org_read on public.fleets for select to authenticated
--     using (organization_id = current_user_org());

-- ── 3. GraphQL exposure to client roles (advisors 0026/0027) ─────────────────
-- NOTE: the pg_graphql grants come from DEFAULT PRIVILEGES owned by supabase_admin,
-- so revoking them usually fails with 42501 / gets reintroduced. That's OK —
-- GraphQL queries STILL respect RLS, so the REAL protection is section 2 (no
-- permissive USING true policies). This revoke is best-effort defense-in-depth,
-- wrapped so a permission error can't abort the migration. To fully disable
-- GraphQL, use the Supabase dashboard/support (disable pg_graphql) — not a migration.
do $$ begin
  begin
    revoke execute on all functions in schema graphql_public from anon, authenticated;
  exception when others then
    raise notice '225: GraphQL revoke skipped (%) — RLS in section 2 is the real guard', sqlerrm;
  end;
end $$;

-- ── 4. Public storage buckets (advisor 0025) — per code audit ────────────────
--   driver-documents = PII (CDLs, medical cards). The doc record stores the object
--     PATH (not a public URL), so reads go via signed/service-role -> safe to make
--     private. FLIP THIS ONE.
--   oo-logos = served via getPublicUrl() in app/api/ronyx/owner-operators/[id]/logo
--     -> KEEP PUBLIC (flipping 404s the logos; switch that route to createSignedUrl
--     first if you want it private). Low sensitivity (company branding).
--   avatars = rendered on PUBLIC driver-resume / recruiter-profile pages ->
--     KEEP PUBLIC (flipping breaks those pages). Low sensitivity.
-- VERIFY: no <img> points at a public driver-documents URL before applying.
update storage.buckets set public = false
where id = 'driver-documents';

-- ── Ledger ───────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values (225, 'security_hardening_client_exposure')
on conflict (version) do nothing;
