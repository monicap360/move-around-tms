-- Migration: create driver_status, maintenance_reports, and part_orders tables

-- driver availability / status
create table if not exists driver_status (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id),
  status text check (status in ('Available','On Duty','Standby','Off','Quit')) default 'Off',
  updated_at timestamp default now()
);

-- maintenance reports created by drivers
create table if not exists maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid references trucks(id),
  driver_id uuid references drivers(id),
  description text,
  severity text check (severity in ('Low','Medium','High')) default 'Low',
  status text check (status in ('Pending','Approved','In Progress','Completed')) default 'Pending',
  created_at timestamp default now()
);

-- mechanic part requests linked to a report
create table if not exists part_orders (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references maintenance_reports(id),
  mechanic_id uuid references employees(id),
  parts_needed jsonb,
  estimated_cost numeric(10,2),
  approved_by_owner boolean default false,
  approved_by_manager boolean default false,
  status text check (status in ('Pending','Approved','Ordered','Delivered')) default 'Pending',
  created_at timestamp default now()
);
