create table if not exists ronyx_driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null,
  doc_type text not null,
  status text default 'pending',
  expires_on date,
  uploaded_at timestamptz default now(),
  file_url text,
  verified_by text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
