-- Staff Tasks — operational task queue linked to COI, payroll, maintenance events
-- Prevents duplicate open tasks via partial unique index on (oo_id, document_type, task_type) WHERE status='open'

create table if not exists public.ronyx_staff_tasks (
  id                       uuid primary key default gen_random_uuid(),

  -- Classification
  task_type                text not null,
  -- COI: coi_missing | coi_expired | coi_expiring_7d | coi_expiring_30d
  --      coi_needs_review | coi_rejected | coi_ronyx_blocked | coi_mm_blocked
  -- Other: payroll_hold | maintenance | dispatch_block | general

  title                    text not null,
  description              text,

  -- Status & priority
  status                   text not null default 'open'
                             check (status in ('open','in_progress','completed','cancelled','waiting','blocked')),
  priority                 text not null default 'high'
                             check (priority in ('critical','high','normal','low')),

  -- Assignment (name-based, no auth.users FK required)
  assigned_to_name         text,

  -- Linked entities (denormalized for audit permanence)
  owner_operator_id        uuid references public.ronyx_owner_operators(id) on delete set null,
  owner_operator_name      text,
  document_type            text,
  coi_document_id          uuid references public.ronyx_oo_coi_documents(id) on delete set null,

  -- Scheduling
  due_date                 date,

  -- Completion
  completed_at             timestamptz,
  completed_by             text,
  completion_notes         text,

  -- Manager override (close task even when underlying issue isn't resolved)
  manager_override         boolean not null default false,
  manager_override_reason  text,

  -- Follow-up tracking
  reminder_count           int not null default 0,
  last_reminder_sent_at    timestamptz,

  notes                    text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Prevent duplicate open tasks for the same OO + document + task_type
create unique index if not exists ronyx_staff_tasks_dedup_open_idx
  on public.ronyx_staff_tasks(owner_operator_id, document_type, task_type)
  where status = 'open';

create index if not exists ronyx_staff_tasks_assigned_idx  on public.ronyx_staff_tasks(assigned_to_name, status);
create index if not exists ronyx_staff_tasks_oo_idx         on public.ronyx_staff_tasks(owner_operator_id);
create index if not exists ronyx_staff_tasks_status_idx     on public.ronyx_staff_tasks(status, priority);
create index if not exists ronyx_staff_tasks_due_idx        on public.ronyx_staff_tasks(due_date) where status = 'open';
create index if not exists ronyx_staff_tasks_type_idx       on public.ronyx_staff_tasks(task_type, status);
