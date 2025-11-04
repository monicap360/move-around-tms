-- Admin Check Function for Move Around TMS
-- This function checks if a user is an admin by looking up their user_id in the admin_users table

create or replace function public.is_admin(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from admin_users where admin_users.user_id = is_admin.user_id
  );
$$ language sql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.is_admin(uuid) to authenticated;

-- Optional: Add some helpful comments
comment on function public.is_admin(uuid) is 'Checks if a given user_id belongs to an admin user';