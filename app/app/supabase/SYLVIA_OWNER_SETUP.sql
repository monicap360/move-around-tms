-- === SYLVIA OWNER UPGRADE - GLOBAL ACCESS SETUP ===================================
-- Run this in Supabase SQL Editor after basic setup

-- 1️⃣ Elevate Sylvia to Owner (Global Access)
update public.profiles
set role = 'owner'
where id = (
  select id from auth.users
  where email = 'sylviaypena@yahoo.com'
);

-- 2️⃣ Keep her partner record for commission tracking
insert into public.partners (user_id, full_name, email, theme)
select u.id, 'Sylvia Peña', 'sylviaypena@yahoo.com', '{
  "brand": "MoveAround TMS",
  "primary": "#10b981", 
  "secondary": "#059669",
  "background": "#FFFFFF",
  "logo": "/assets/movearound-logo.png",
  "tagline": "Owner Access - All Systems"
}'::jsonb
from auth.users u
where u.email = 'sylviaypena@yahoo.com'
on conflict (user_id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    theme = excluded.theme;

-- 3️⃣ Link existing companies to Sylvia if no partner assigned
update public.companies
set partner_id = (
  select id from public.partners where email = 'sylviaypena@yahoo.com'
)
where partner_id is null;

-- === OWNER GLOBAL ACCESS POLICIES ===================================

-- Companies: owners and super_admins see everything
drop policy if exists "owners and super_admins see all companies" on public.companies;
create policy "owners and super_admins see all companies"
on public.companies
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('super_admin','owner')
  )
);

-- HR/Employees: owners and super_admins see all HR data
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'employees') then
    execute 'alter table public.employees enable row level security';
    execute 'drop policy if exists "owners and super_admins see all HR" on public.employees';
    execute 'create policy "owners and super_admins see all HR" on public.employees for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in (''super_admin'',''owner'')
      )
    )';
  end if;
end $$;

-- Payroll: owners and super_admins see all payroll data
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'payroll') then
    execute 'alter table public.payroll enable row level security';
    execute 'drop policy if exists "owners and super_admins see all payroll" on public.payroll';
    execute 'create policy "owners and super_admins see all payroll" on public.payroll for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in (''super_admin'',''owner'')
      )
    )';
  end if;
end $$;

-- Drivers: owners and super_admins see all drivers
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'drivers') then
    execute 'alter table public.drivers enable row level security';
    execute 'drop policy if exists "owners and super_admins see all drivers" on public.drivers';
    execute 'create policy "owners and super_admins see all drivers" on public.drivers for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in (''super_admin'',''owner'')
      )
    )';
  end if;
end $$;

-- Tickets: owners and super_admins see all tickets
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'tickets') then
    execute 'alter table public.tickets enable row level security';
    execute 'drop policy if exists "owners and super_admins see all tickets" on public.tickets';
    execute 'create policy "owners and super_admins see all tickets" on public.tickets for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in (''super_admin'',''owner'')
      )
    )';
  end if;
end $$;

-- Loads: owners and super_admins see all loads
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'loads') then
    execute 'alter table public.loads enable row level security';
    execute 'drop policy if exists "owners and super_admins see all loads" on public.loads';
    execute 'create policy "owners and super_admins see all loads" on public.loads for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in (''super_admin'',''owner'')
      )
    )';
  end if;
end $$;

-- Assets: owners and super_admins see all assets
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'assets') then
    execute 'alter table public.assets enable row level security';
    execute 'drop policy if exists "owners and super_admins see all assets" on public.assets';
    execute 'create policy "owners and super_admins see all assets" on public.assets for all using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in (''super_admin'',''owner'')
      )
    )';
  end if;
end $$;

-- === SUCCESS CONFIRMATION ===================================
select 
  'Sylvia Owner Setup Complete! ✅' as status,
  p.role as sylvia_role,
  partners.full_name as partner_name,
  count(c.*) as companies_accessible
from public.profiles p
left join public.partners on partners.user_id = p.id
left join public.companies c on c.partner_id = partners.id
where p.id = (select id from auth.users where email = 'sylviaypena@yahoo.com')
group by p.role, partners.full_name;