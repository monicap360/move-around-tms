-- ==================================================
-- Migration: Notifications table for compliance alerts
-- ==================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.drivers(id) on delete cascade,
  message text not null,
  created_at timestamp with time zone default now(),
  metadata jsonb
);

-- Avoid duplicate notifications for the same document and expiration date
-- We'll use a natural key stored in metadata: { doc_id, expiration_date }
create unique index if not exists ux_notifications_doc_unique
  on public.notifications ((metadata->>'doc_id'), (metadata->>'expiration_date'));

comment on table public.notifications is 'User-facing notifications such as expiring HR documents';
