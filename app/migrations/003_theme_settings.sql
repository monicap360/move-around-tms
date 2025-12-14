-- MoveAround Galaxy: Theme/Brand Settings Table
create table if not exists theme_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz default now()
);

-- Example: Insert default theme for an org
insert into theme_settings (org_id, key, value)
select id, 'primary', '#2D2A4A' from organizations on conflict do nothing;

-- RLS: Only org admins can update their theme
alter table theme_settings enable row level security;
create policy "Org can update their theme" on theme_settings
  for update using (auth.uid() in (select user_id from org_admins where org_id = theme_settings.org_id));

-- Add more theme keys as needed: secondary, accent, background, etc.

-- Example: Query theme for an org
-- select key, value from theme_settings where org_id = :org_id;
