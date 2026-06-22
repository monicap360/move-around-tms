-- FMCSA integration support

-- 1. Add api_key column to ronyx_integrations (stores the FMCSA web key)
alter table ronyx_integrations add column if not exists api_key text;

-- 2. Seed the FMCSA integration row (disabled until key is configured)
insert into ronyx_integrations (name, category, status, enabled)
values ('FMCSA', 'Compliance', 'disconnected', false)
on conflict (name) do nothing;

-- 3. Lookup audit log — one row per FMCSA API call, never stores the key
create table if not exists ronyx_fmcsa_lookup_log (
  id               uuid primary key default gen_random_uuid(),
  oo_id            uuid,
  dot_number       text,
  mc_number        text,
  lookup_type      text,    -- 'dot' | 'mc'
  found            boolean  not null default false,
  result_snapshot  jsonb,   -- raw FMCSA carrier object
  looked_up_at     timestamptz not null default now()
);

create index if not exists idx_fmcsa_log_oo   on ronyx_fmcsa_lookup_log(oo_id, looked_up_at desc);
create index if not exists idx_fmcsa_log_dot  on ronyx_fmcsa_lookup_log(dot_number);
create index if not exists idx_fmcsa_log_mc   on ronyx_fmcsa_lookup_log(mc_number);

-- 4. Add FMCSA-verified columns to ronyx_owner_operators
alter table ronyx_owner_operators
  add column if not exists fmcsa_verified_at      timestamptz,
  add column if not exists fmcsa_operating_status text,
  add column if not exists fmcsa_safety_rating    text,
  add column if not exists fmcsa_legal_name       text;
