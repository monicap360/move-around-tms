-- Migration 220: CAPTURE live-only objects (functions, policies, views) into the
-- numbered chain so a clean rebuild reproduces them. Reverse-engineered verbatim
-- from live catalogs (pg_get_functiondef / pg_get_viewdef / pg_policies) 2026-06-24.
--
-- Reconciliation applied: aggregate_ticket_summary join switched fleets → trucks
-- (per Tier-4 decision; matches the 219 FK re-point).
--
-- Views are created WITHOUT security_invoker to match current live behavior
-- (Postgres default). Revisit if org-isolation on these views is desired.
--
-- STILL PENDING (not captured here — need full text):
--   • v_dispatch_blocking_evaluation  (pg_get_viewdef text was summarized, not raw)
--   • trucks "Admins can manage trucks" policy (exact qual not yet extracted)
--   See placeholders at the bottom.

-- ── 1. Functions (live-only / canonical compat versions) ────────────────────
create or replace function public.is_admin()
 returns boolean
 language sql
 stable
 set search_path to 'pg_catalog','public'
as $function$
  select coalesce((auth.jwt() ->> 'admin')::boolean, false);
$function$;

-- current_user_org(): live compat-aware version (handles profiles.id OR user_id).
create or replace function public.current_user_org()
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_org uuid;
  has_id boolean;
  has_user_id boolean;
begin
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='profiles' and column_name='id') into has_id;
  select exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='profiles' and column_name='user_id') into has_user_id;
  if has_id then
    execute 'select organization_id from public.profiles where id = auth.uid() limit 1' into v_org;
  elsif has_user_id then
    execute 'select organization_id from public.profiles where user_id = auth.uid() limit 1' into v_org;
  else
    v_org := null;
  end if;
  return v_org;
end;
$function$;

-- ── 2. aggregate_tickets policies (phase2 org-scoped CRUD + admin) ───────────
drop policy if exists "phase2_aggregate_tickets_select_org" on public.aggregate_tickets;
create policy "phase2_aggregate_tickets_select_org" on public.aggregate_tickets
  for select using (organization_id = current_user_org());

drop policy if exists "phase2_aggregate_tickets_insert_org" on public.aggregate_tickets;
create policy "phase2_aggregate_tickets_insert_org" on public.aggregate_tickets
  for insert with check (organization_id = current_user_org());

drop policy if exists "phase2_aggregate_tickets_update_org" on public.aggregate_tickets;
create policy "phase2_aggregate_tickets_update_org" on public.aggregate_tickets
  for update using (organization_id = current_user_org())
            with check (organization_id = current_user_org());

drop policy if exists "phase2_aggregate_tickets_delete_org" on public.aggregate_tickets;
create policy "phase2_aggregate_tickets_delete_org" on public.aggregate_tickets
  for delete using (organization_id = current_user_org());

drop policy if exists "Admins full access on tickets" on public.aggregate_tickets;
create policy "Admins full access on tickets" on public.aggregate_tickets
  for all using (is_admin()) with check (is_admin());

-- ── 3. Views (verbatim from live; aggregate_ticket_summary join fleets→trucks) ──
create or replace view public.aggregate_ticket_summary as
select t.id,
       t.ticket_number,
       d.name      as driver_name,
       d.pay_type  as employment_type,
       tr.truck_number,
       tr.make,
       tr.model,
       t.material,
       t.unit_type,
       t.quantity,
       t.pay_rate,
       t.bill_rate,
       t.total_pay,
       t.total_bill,
       t.total_profit,
       t.status,
       t.ticket_date,
       t.upload_url,
       t.created_at
from public.aggregate_tickets t
  left join public.drivers d on t.driver_id = d.id
  left join public.trucks  tr on t.truck_id = tr.id   -- was: fleets f (Tier-4 re-point)
order by t.created_at desc;

create or replace view public.v_dispatch_available_resources as
with drv as (
  select d.organization_id,
         count(*) filter (where (lower(coalesce(d.status,''::text)) = any (array['active'::text,'available'::text]))
                            and coalesce(d.dispatch_eligible, true)
                            and (coalesce(d.compliance_status,'Clear'::text) <> all (array['Blocked'::text,'Suspended'::text])))::integer as drivers_available,
         count(*) filter (where not coalesce(d.dispatch_eligible, true)
                            or coalesce(d.dispatch_block_reason,''::text) <> ''::text
                            or (coalesce(d.compliance_status,''::text) = any (array['Blocked'::text,'Suspended'::text])))::integer as drivers_blocked
  from public.drivers d
  group by d.organization_id
), trk as (
  select t.organization_id,
         count(*) filter (where lower(coalesce(t.status,''::text)) = any (array['active'::text,'available'::text]))::integer as trucks_available,
         count(*) filter (where lower(coalesce(t.status,''::text)) = any (array['down'::text,'out_of_service'::text,'maintenance'::text]))::integer as trucks_down
  from public.trucks t
  group by t.organization_id
), oo as (
  select r.organization_id,
         count(*) filter (where lower(coalesce(r.status,''::text)) = any (array['active'::text,'approved'::text]))::integer as owner_operators_available
  from public.ronyx_owner_operators r
  group by r.organization_id
)
select coalesce(drv.organization_id, trk.organization_id, oo.organization_id) as organization_id,
       coalesce(drv.drivers_available, 0)         as drivers_available,
       coalesce(drv.drivers_blocked, 0)           as drivers_blocked,
       coalesce(trk.trucks_available, 0)          as trucks_available,
       coalesce(trk.trucks_down, 0)               as trucks_down,
       coalesce(oo.owner_operators_available, 0)  as owner_operators_available
from drv
  full join trk on trk.organization_id = drv.organization_id
  full join oo  on oo.organization_id = coalesce(drv.organization_id, trk.organization_id);

create or replace view public.v_ronyx_ticket_review as
select id,
       organization_id,
       ticket_number,
       truck_number,
       ticket_date,
       customer_name,
       pit_location_name,
       driver_name,
       ocr_confidence,
       extraction_confidence,
       missing_fields,
       signature_present,
       jsonb_build_object('start_time', start_time, 'end_time', end_time, 'total_hours', total_hours) as time_status,
       payroll_hold,
       billing_hold,
       exception_flags,
       reconciliation_status,
       payroll_ready,
       billing_ready,
       updated_at
from public.aggregate_tickets a
where document_type = 'ronyx_field_ticket'::text;

-- ── 4. DEFERRED CAPTURE (rebuild-only — NOT applied here) ────────────────────
-- These two objects ALREADY EXIST in the live DB (verified 2026-06-24:
-- v_dispatch_blocking_evaluation present; "Admins can manage trucks" policy
-- present). So applying this migration does NOT affect live. They are only
-- missing from a clean FROM-SCRATCH rebuild. To make 220 fully replayable,
-- paste the raw defs and replace the two stubs below:
--   create or replace view public.v_dispatch_blocking_evaluation as <RAW pg_get_viewdef text>;
--   drop policy if exists "Admins can manage trucks" on public.trucks;
--   create policy "Admins can manage trucks" on public.trucks <EXACT cmd/roles/qual/with_check>;
