create table if not exists ronyx_job_sites (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  location text,
  contact_name text,
  contact_phone text,
  hours text,
  access_notes text,
  unload_instructions text,
  history text,
  alerts text,
  rating integer,
  rating_note text,
  gps text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
