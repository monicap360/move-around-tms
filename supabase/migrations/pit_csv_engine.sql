-- Table for learned pit CSV formats
create table if not exists pit_csv_formats (
  id uuid primary key default gen_random_uuid(),
  pit_name text,
  sample_filename text,
  column_ticket text,
  column_date text,
  column_material text,
  column_tonnage text,
  column_amount text,
  column_truck text,
  column_job text,
  column_po text,
  delimiter text default ',',
  skip_header boolean default true,
  created_at timestamptz default now()
);

-- Imported CSV Rows Table (Universal)
create table if not exists pit_csv_imports (
  id uuid primary key default gen_random_uuid(),
  pit_name text,
  organization_id uuid references organizations(id),
  ticket_number text,
  date date,
  material text,
  tonnage numeric,
  amount numeric,
  truck_number text,
  job_number text,
  po_number text,
  raw_data jsonb,
  created_at timestamptz default now()
);
