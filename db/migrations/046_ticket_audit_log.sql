-- Migration 046: Ticket Audit Log for Timeline
-- Purpose: Track all changes to tickets for timeline/history view

create table if not exists ticket_audit_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references aggregate_tickets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- 'created', 'updated', 'status_changed', 'approved', 'rejected', etc.
  field_name text, -- Field that was changed (if applicable)
  old_value text, -- Previous value (JSON string for complex types)
  new_value text, -- New value (JSON string for complex types)
  description text, -- Human-readable description
  metadata jsonb, -- Additional metadata
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_ticket_audit_ticket on ticket_audit_log(ticket_id);
create index if not exists idx_ticket_audit_user on ticket_audit_log(user_id);
create index if not exists idx_ticket_audit_created on ticket_audit_log(created_at desc);

-- RLS Policies
alter table ticket_audit_log enable row level security;

create policy "Users can view audit logs"
  on ticket_audit_log
  for select
  using (true); -- Adjust based on your organization structure

-- Comments
comment on table ticket_audit_log is 'Audit trail for all ticket changes';
comment on column ticket_audit_log.action is 'Type of action performed';
comment on column ticket_audit_log.metadata is 'Additional metadata about the change';
