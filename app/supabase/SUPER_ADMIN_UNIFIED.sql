-- === UNIFIED SUPER ADMIN SETUP - ALL FOUR GLOBAL ACCESS ===================================
-- Run this in Supabase SQL Editor - Safe to re-run anytime

-- 1️⃣ Elevate all four key users to super_admin
update public.profiles
set role = 'super_admin'
where id in (
  select id from auth.users
  where email in (
    'cruisesfromgalveston.texas@gmail.com',   -- Monica Peña
    'brecamario@gmail.com',                   -- Breanna Camario  
    'shamsaalansari@hotmail.com',             -- Shamsa Al Ansari
    'sylviaypena@yahoo.com'                   -- Sylvia Peña
  )
);

-- 2️⃣ Global access policies for ALL core tables
-- Super admins can see/edit everything across all companies/partners

-- Companies
drop policy if exists "super_admins full access - companies" on public.companies;
create policy "super_admins full access - companies"
on public.companies
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

-- Partners
drop policy if exists "super_admins full access - partners" on public.partners;
create policy "super_admins full access - partners"
on public.partners
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

-- Profiles
drop policy if exists "super_admins full access - profiles" on public.profiles;
create policy "super_admins full access - profiles"
on public.profiles
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

-- Referrals
drop policy if exists "super_admins full access - referrals" on public.referrals;
create policy "super_admins full access - referrals"
on public.referrals
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  )
);

-- === EXISTING TMS TABLES - SUPER ADMIN ACCESS ===================================

-- Employees (HR data)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'employees') then
    execute 'alter table public.employees enable row level security';
    execute 'drop policy if exists "super_admins full access - employees" on public.employees';
    execute 'create policy "super_admins full access - employees" on public.employees for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- Payroll
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'payroll') then
    execute 'alter table public.payroll enable row level security';
    execute 'drop policy if exists "super_admins full access - payroll" on public.payroll';
    execute 'create policy "super_admins full access - payroll" on public.payroll for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- Drivers
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'drivers') then
    execute 'alter table public.drivers enable row level security';
    execute 'drop policy if exists "super_admins full access - drivers" on public.drivers';
    execute 'create policy "super_admins full access - drivers" on public.drivers for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- Tickets
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'tickets') then
    execute 'alter table public.tickets enable row level security';
    execute 'drop policy if exists "super_admins full access - tickets" on public.tickets';
    execute 'create policy "super_admins full access - tickets" on public.tickets for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- Loads
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'loads') then
    execute 'alter table public.loads enable row level security';
    execute 'drop policy if exists "super_admins full access - loads" on public.loads';
    execute 'create policy "super_admins full access - loads" on public.loads for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- Assets
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'assets') then
    execute 'alter table public.assets enable row level security';
    execute 'drop policy if exists "super_admins full access - assets" on public.assets';
    execute 'create policy "super_admins full access - assets" on public.assets for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- Vehicles
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'vehicles') then
    execute 'alter table public.vehicles enable row level security';
    execute 'drop policy if exists "super_admins full access - vehicles" on public.vehicles';
    execute 'create policy "super_admins full access - vehicles" on public.vehicles for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = ''super_admin''
      )
    )';
  end if;
end $$;

-- === TEMPLATE FOR FUTURE TABLES ===================================
-- Copy this pattern for any new table:
--
-- drop policy if exists "super_admins full access - TABLE_NAME" on public.TABLE_NAME;
-- create policy "super_admins full access - TABLE_NAME"
-- on public.TABLE_NAME
-- for all using (
--   exists (
--     select 1 from public.profiles p
--     where p.id = auth.uid() and p.role = 'super_admin'
--   )
-- );

-- === SUCCESS CONFIRMATION ===================================
select 
  'Super Admin Setup Complete! ✅' as status,
  array_agg(u.email) as super_admin_emails,
  count(*) as total_super_admins
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'super_admin';