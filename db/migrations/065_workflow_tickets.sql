-- Migration 065: Workflow tickets for plant operations

create table if not exists public.workflow_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in ('matching','excel_import')),
  source_id uuid,
  department text not null check (department in ('warehouse','procurement','accounting','supplier')),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_review','resolved','dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_workflow_tickets_org on public.workflow_tickets(organization_id);
create index if not exists idx_workflow_tickets_status on public.workflow_tickets(status);

alter table public.workflow_tickets enable row level security;

create policy "workflow_tickets_select" on public.workflow_tickets
  for select using (true);

create policy "workflow_tickets_insert" on public.workflow_tickets
  for insert with check (true);

create policy "workflow_tickets_update" on public.workflow_tickets
  for update using (true);
