-- Page Protection Audit Log
-- Records right-click, copy, print, drag, and save attempts on protected pages

create table if not exists public.page_protection_logs (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,
  -- right_click | copy_attempt | print_attempt | drag_attempt | save_attempt
  -- view_source_attempt | printscreen_attempt | print
  page_url    text,
  staff_name  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists page_protection_logs_type_idx  on public.page_protection_logs(event_type);
create index if not exists page_protection_logs_staff_idx on public.page_protection_logs(staff_name);
create index if not exists page_protection_logs_time_idx  on public.page_protection_logs(created_at desc);
