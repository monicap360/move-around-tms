-- Migration 049: Ticket Workflow Rules & Automation
-- Purpose: Store approval workflow rules and track workflow execution

create table if not exists ticket_workflow_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_name text not null,
  rule_condition jsonb not null, -- JSON representation of condition
  action text not null check (action in ('auto_approve', 'require_manager', 'require_admin', 'flag_for_review')),
  priority integer not null default 100,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ticket_workflow_executions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references aggregate_tickets(id) on delete cascade,
  rule_id uuid references ticket_workflow_rules(id) on delete set null,
  action_taken text not null,
  reason text,
  executed_at timestamptz default now(),
  executed_by uuid references auth.users(id) on delete set null
);

-- Indexes
create index if not exists idx_workflow_rules_org on ticket_workflow_rules(organization_id, active);
create index if not exists idx_workflow_executions_ticket on ticket_workflow_executions(ticket_id);
create index if not exists idx_workflow_executions_rule on ticket_workflow_executions(rule_id);

-- RLS Policies
alter table ticket_workflow_rules enable row level security;
alter table ticket_workflow_executions enable row level security;

create policy "Users can view workflow rules"
  on ticket_workflow_rules
  for select
  using (true); -- Adjust based on organization structure

create policy "Users can view workflow executions"
  on ticket_workflow_executions
  for select
  using (true); -- Adjust based on organization structure

-- Comments
comment on table ticket_workflow_rules is 'Approval workflow rules for automated ticket processing';
comment on table ticket_workflow_executions is 'Log of workflow rule executions for tickets';
