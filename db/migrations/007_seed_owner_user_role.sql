-- Seed initial owner role based on auth.users email.
-- Replace the email if needed before running in Supabase.

-- Ensure pgcrypto is available for UUIDs if other migrations rely on it
create extension if not exists "pgcrypto";

insert into user_roles (user_id, role, company)
select u.id, 'owner', coalesce(ur.company, 'Solis Trucking LLC')
from auth.users u
left join (select distinct company from user_roles) ur on true
where u.email = 'you@solistrucking.com'
on conflict (user_id, role, company) do nothing;
