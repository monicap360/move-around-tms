-- Seed trucks, driver, and contract notes for Urdaneta Trucking LLC
-- Data sourced from signed Subhauler Agreement packet dated 2025-11-16

-- Add truck type column if not present
alter table public.ronyx_oo_trucks add column if not exists type text;

do $$
declare
  v_oo_id uuid;
begin
  -- Look up the OO record (created on first page load via REQUIRED_OOS)
  select id into v_oo_id
  from public.ronyx_owner_operators
  where company_name ilike 'Urdaneta Trucking LLC'
  limit 1;

  if v_oo_id is null then
    raise notice 'Urdaneta Trucking LLC not found — run after first OO page load';
    return;
  end if;

  -- ── Trucks ──────────────────────────────────────────────────────
  insert into public.ronyx_oo_trucks (oo_id, truck_number, make, model, year, type, status)
  values
    (v_oo_id, '111',  null, null, '2007', 'Quad-Axle Truck',  'active'),
    (v_oo_id, '22',   null, null, '2004', 'Tri-Axle Truck',   'active'),
    (v_oo_id, '733',  null, null, '2012', 'Belly Dump',       'active')
  on conflict do nothing;

  -- ── Driver / Owner ───────────────────────────────────────────────
  insert into public.ronyx_oo_drivers (oo_id, name, phone)
  values (v_oo_id, 'Reynaldo Urdaneta', '346-592-8329')
  on conflict do nothing;

  -- ── Job / Project note ───────────────────────────────────────────
  insert into public.ronyx_oo_jobs (oo_id, job_name, load_date, notes)
  values (
    v_oo_id,
    'Domino Project — Lebanon, IN (TC Redwine Services)',
    '2025-11-16',
    'General Contractor: TC Redwine Services LLC. Commission: 10% of freight rate. Signed Subhauler Agreement with Ronyx Logistics LLC. ACH: Bank of America, routing 111000025, account 488107861748 (checking). Authorized signer: Reynaldo Urdaneta, Manager.'
  )
  on conflict do nothing;

end $$;
