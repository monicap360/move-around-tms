-- ⚙️ SUPER ADMIN SETUP - Final Implementation
-- Run this entire file in Supabase SQL Editor

-- Step 1: Tag these users as super_admin
update public.profiles
set role = 'super_admin'
where id in (
  select id from auth.users
  where email in (
    'cruisesfromgalveston.texas@gmail.com',
    'brecamario@gmail.com',
    'shamsaalansari@hotmail.com',
    'sylviaypena@yahoo.com'
  )
);

-- Step 2: Global "bypass RLS" helper function
-- Returns TRUE if current user is a registered super_admin
create or replace function public.is_super_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on p.id = u.id
    where p.role = 'super_admin'
      and p.id = uid
  );
$$ language sql stable;

-- Grant permissions so RLS can call it
revoke all on function public.is_super_admin(uuid) from public;
grant execute on function public.is_super_admin(uuid) to anon, authenticated, service_role;

-- Step 3: Universal policy template for existing tables
-- Companies
create policy if not exists "super_admins bypass RLS"
on public.companies
for all
using ( public.is_super_admin(auth.uid()) );

-- Partners
create policy if not exists "super_admins bypass RLS - partners"
on public.partners
for all
using ( public.is_super_admin(auth.uid()) );

-- Profiles
create policy if not exists "super_admins bypass RLS - profiles"
on public.profiles
for all
using ( public.is_super_admin(auth.uid()) );

-- Referrals
create policy if not exists "super_admins bypass RLS - referrals"
on public.referrals
for all
using ( public.is_super_admin(auth.uid()) );

-- HR - Employees
create policy if not exists "super_admins bypass RLS - employees"
on public.employees
for all
using ( public.is_super_admin(auth.uid()) );

-- Payroll
create policy if not exists "super_admins bypass RLS - payroll"
on public.payroll
for all
using ( public.is_super_admin(auth.uid()) );

-- Drivers
create policy if not exists "super_admins bypass RLS - drivers"
on public.drivers
for all
using ( public.is_super_admin(auth.uid()) );

-- Tickets
create policy if not exists "super_admins bypass RLS - tickets"
on public.tickets
for all
using ( public.is_super_admin(auth.uid()) );

-- Loads
create policy if not exists "super_admins bypass RLS - loads"
on public.loads
for all
using ( public.is_super_admin(auth.uid()) );

-- Assets
create policy if not exists "super_admins bypass RLS - assets"
on public.assets
for all
using ( public.is_super_admin(auth.uid()) );

-- Vehicles
create policy if not exists "super_admins bypass RLS - vehicles"
on public.vehicles
for all
using ( public.is_super_admin(auth.uid()) );

-- Invoices
create policy if not exists "super_admins bypass RLS - invoices"
on public.invoices
for all
using ( public.is_super_admin(auth.uid()) );

-- Fleet Management
create policy if not exists "super_admins bypass RLS - fleet"
on public.fleet
for all
using ( public.is_super_admin(auth.uid()) );

-- Maintenance
create policy if not exists "super_admins bypass RLS - maintenance"
on public.maintenance
for all
using ( public.is_super_admin(auth.uid()) );

-- Compliance
create policy if not exists "super_admins bypass RLS - compliance"
on public.compliance
for all
using ( public.is_super_admin(auth.uid()) );

-- Contracts
create policy if not exists "super_admins bypass RLS - contracts"
on public.contracts
for all
using ( public.is_super_admin(auth.uid()) );

-- Vendors
create policy if not exists "super_admins bypass RLS - vendors"
on public.vendors
for all
using ( public.is_super_admin(auth.uid()) );

-- IFTA
create policy if not exists "super_admins bypass RLS - ifta"
on public.ifta
for all
using ( public.is_super_admin(auth.uid()) );

-- Factoring
create policy if not exists "super_admins bypass RLS - factoring"
on public.factoring
for all
using ( public.is_super_admin(auth.uid()) );

-- Material Rates
create policy if not exists "super_admins bypass RLS - material_rates"
on public.material_rates
for all
using ( public.is_super_admin(auth.uid()) );

-- 🧩 Step 4: Future-proof template (copy this for new tables)
-- When you add a new table, run:
-- 
-- alter table public.<new_table> enable row level security;
-- create policy "super_admins bypass RLS - <new_table>"
-- on public.<new_table>
-- for all
-- using ( public.is_super_admin(auth.uid()) );

-- ✅ Setup Complete!
-- Monica, Breanna, Shamsa, and Sylvia now have universal access to all data
-- No more manual policy updates needed for these four super admins