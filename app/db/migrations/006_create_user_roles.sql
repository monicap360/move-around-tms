-- ==================================================
-- Migration: Create user_roles table
-- Tracks per-user roles for access control
-- ==================================================

-- Enable UUID generation (needed for gen_random_uuid)
create extension if not exists "pgcrypto";

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','admin','manager','hr','office','driver')) not null,
  company text default 'Solis Trucking LLC',
  created_at timestamp default now()
);

-- Helpful indexes
create index if not exists idx_user_roles_user on user_roles(user_id);
create index if not exists idx_user_roles_role on user_roles(role);
create index if not exists idx_user_roles_company on user_roles(company);

-- Prevent duplicate assignment of the same role for the same user in the same company
create unique index if not exists ux_user_roles_user_role_company
  on user_roles(user_id, role, company);

comment on table user_roles is 'Application roles per user (owner/admin/manager/hr/office/driver)';