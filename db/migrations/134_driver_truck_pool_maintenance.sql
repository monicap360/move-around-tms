-- Driver Truck Pool + Maintenance Reassignment System
-- Allows each driver to be pre-approved for up to 4 trucks (primary + 3 backups)
-- Tracks maintenance events and reassignment history

-- ── Driver → Truck Assignment Pool ──────────────────────────────────
create table if not exists public.ronyx_driver_truck_assignments (
  id                      uuid primary key default gen_random_uuid(),
  oo_id                   uuid not null references public.ronyx_owner_operators(id) on delete cascade,
  driver_id               uuid not null references public.ronyx_oo_drivers(id) on delete cascade,
  truck_id                uuid not null references public.ronyx_oo_trucks(id) on delete cascade,

  -- priority: 1 = primary, 2 = backup 1, 3 = backup 2, 4 = backup 3
  priority                integer not null default 2 check (priority between 1 and 4),
  assignment_type         text not null default 'backup'
                            check (assignment_type in ('primary','backup')),

  requires_manager_approval boolean not null default false,
  is_active               boolean not null default true,

  assigned_by             text,   -- staff name/email
  notes                   text,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),

  unique (driver_id, truck_id)
);

create index if not exists idx_ronyx_dta_oo     on public.ronyx_driver_truck_assignments(oo_id);
create index if not exists idx_ronyx_dta_driver on public.ronyx_driver_truck_assignments(driver_id);
create index if not exists idx_ronyx_dta_truck  on public.ronyx_driver_truck_assignments(truck_id);

-- ── Truck Reassignment Log ───────────────────────────────────────────
create table if not exists public.ronyx_truck_reassignment_logs (
  id                  uuid primary key default gen_random_uuid(),
  oo_id               uuid references public.ronyx_owner_operators(id) on delete set null,

  driver_id           uuid references public.ronyx_oo_drivers(id) on delete set null,
  old_truck_id        uuid references public.ronyx_oo_trucks(id) on delete set null,
  new_truck_id        uuid references public.ronyx_oo_trucks(id) on delete set null,

  -- denormalized for audit trail even if trucks are later deleted
  driver_name         text,
  old_truck_number    text,
  new_truck_number    text,

  reason              text,
  reassigned_by       text,
  manager_override    boolean not null default false,
  notes               text,

  reassigned_at       timestamptz default now()
);

create index if not exists idx_ronyx_rrl_oo     on public.ronyx_truck_reassignment_logs(oo_id);
create index if not exists idx_ronyx_rrl_driver on public.ronyx_truck_reassignment_logs(driver_id);

-- ── Maintenance Events ───────────────────────────────────────────────
create table if not exists public.ronyx_maintenance_events (
  id                  uuid primary key default gen_random_uuid(),
  oo_id               uuid references public.ronyx_owner_operators(id) on delete cascade,
  truck_id            uuid references public.ronyx_oo_trucks(id) on delete set null,

  -- denormalized for display
  truck_number        text,
  oo_company_name     text,

  event_type          text not null
                        check (event_type in (
                          'breakdown','inspection_failed','inspection_due',
                          'insurance_expired','registration_expired',
                          'out_of_service','scheduled_maintenance','needs_review'
                        )),
  severity            text not null default 'medium'
                        check (severity in ('low','medium','high','critical')),

  issue_title         text not null,
  issue_description   text,

  status              text not null default 'open'
                        check (status in ('open','in_progress','resolved','closed')),

  out_of_service      boolean not null default false,
  out_of_service_at   timestamptz,

  estimated_return_at timestamptz,
  actual_return_at    timestamptz,

  reported_by         text,
  resolved_by         text,
  resolved_at         timestamptz,

  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_ronyx_me_oo    on public.ronyx_maintenance_events(oo_id);
create index if not exists idx_ronyx_me_truck on public.ronyx_maintenance_events(truck_id);
create index if not exists idx_ronyx_me_status on public.ronyx_maintenance_events(status);

-- ── Add type column to oo_trucks (if not already in mig 133) ────────
alter table public.ronyx_oo_trucks add column if not exists type text;
