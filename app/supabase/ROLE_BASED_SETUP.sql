-- === MOVE AROUND TMS - ROLE-BASED SETUP =========================================
-- Run this once in Supabase SQL Editor after sending invites

-- === BASE TABLES (idempotent) =========================================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_id uuid references public.partners(id),
  created_at timestamptz default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  theme jsonb default '{
    "primary_color": "#10b981",
    "secondary_color": "#059669", 
    "logo_url": "",
    "company_name": ""
  }'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  company_id uuid references public.companies(id),
  full_name text,
  phone text,
  position text,
  created_at timestamptz default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id),
  company_id uuid references public.companies(id),
  commission numeric default 0,
  status text default 'pending',
  created_at timestamptz default now()
);

-- === AUTO-PROFILE ON NEW USER =========================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, role, full_name) 
  values (
    new.id, 
    'user',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- === RLS POLICIES ==================
alter table public.companies enable row level security;
alter table public.partners enable row level security;
alter table public.profiles enable row level security;
alter table public.referrals enable row level security;

-- Companies: partners see own, super admins see all
drop policy if exists "partners see own companies" on public.companies;
drop policy if exists "super admins see all companies" on public.companies;

create policy "partners see own companies" on public.companies
  for select using (
    partner_id in (select id from public.partners where user_id = auth.uid())
  );

create policy "super admins see all companies" on public.companies
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

-- Profiles: users see own, super admins see all
drop policy if exists "users see own profile" on public.profiles;
drop policy if exists "super admins see all profiles" on public.profiles;

create policy "users see own profile" on public.profiles
  for all using (id = auth.uid());

create policy "super admins see all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

-- === SEED ROLES & PARTNERS BY EMAIL ===================================
with seed(email, full_name, role_tag) as (
  values
    -- SUPER ADMINS
    ('cruisesfromgalveston.texas@gmail.com','Monica Peña','super_admin'),
    ('brecamario@gmail.com','Breanna Camario','super_admin'),  
    ('shamsaalansari@hotmail.com','Shamsa Al Ansari','super_admin'),

    -- PARTNERS
    ('sylviaypena@yahoo.com','Sylvia Peña','partner'),
    ('melidazvl@outlook.com','Veronica Butanda','partner'),
    ('melizondo@taxproms.com','Maria Elizondo','partner'),
    ('anil.meighoo@gmail.com','Anil Meighoo','partner')
    -- TODO: Add Miram Garza when email is provided
)

-- 1) Update profiles with correct roles
, profile_updates as (
  update public.profiles p
  set role = s.role_tag,
      full_name = s.full_name
  from seed s
  join auth.users u on u.email = s.email
  where p.id = u.id
  returning p.id, s.role_tag, s.full_name, s.email
)

-- 2) Create partner records
insert into public.partners (user_id, full_name, email, theme)
select u.id, s.full_name, s.email, '{
  "primary_color": "#10b981",
  "secondary_color": "#059669",
  "logo_url": "",
  "company_name": "' || s.full_name || ' Transport Solutions"
}'::jsonb
from seed s
join auth.users u on u.email = s.email
where s.role_tag = 'partner'
on conflict (user_id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    theme = excluded.theme;

-- === ENABLE EXISTING TMS TABLES FOR NEW SYSTEM ===================================
-- Enable RLS on existing TMS tables and add policies for role-based access

-- Allow super admins full access to all TMS data
do $$
declare
  tbl text;
begin
  -- List of existing TMS tables that need super admin access
  foreach tbl in array ARRAY['loads', 'drivers', 'tickets', 'assets', 'companies', 'vehicles'] loop
    begin
      -- Enable RLS if not already enabled
      execute format('alter table if exists public.%I enable row level security', tbl);
      
      -- Drop existing policy if it exists
      execute format('drop policy if exists "super_admin_full_access" on public.%I', tbl);
      
      -- Create super admin policy
      execute format('create policy "super_admin_full_access" on public.%I for all using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''super_admin'')
      )', tbl);
      
    exception when others then
      -- Continue if table doesn't exist
      null;
    end;
  end loop;
end $$;

-- === SUCCESS MESSAGE ===================================
select 
  'TMS Role-Based Setup Complete! ✅' as status,
  count(*) filter (where role = 'super_admin') as super_admins_created,
  count(*) filter (where role = 'partner') as partners_created
from public.profiles 
where role in ('super_admin', 'partner');