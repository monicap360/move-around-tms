-- ============================================================
-- Customer & Driver Communications + EOD Billing
-- Run in Supabase SQL Editor after dispatch-operations.sql
-- ============================================================

-- 1. customer_messages — outbound communication log per trip
create table if not exists customer_messages (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references dispatch_jobs(id) on delete cascade,
  channel       text not null check (channel in ('sms','email','phone','manual')),
  direction     text not null default 'outbound' check (direction in ('outbound','inbound')),
  message_type  text not null check (message_type in (
    'confirmation','driver_assigned','en_route',
    'arrival','completion','delay','pickup_instructions','custom'
  )),
  body          text not null,
  sent_to       text,         -- phone number or email address
  status        text not null default 'logged'
                  check (status in ('logged','sent','delivered','failed')),
  created_by    text not null default 'dispatch',
  created_at    timestamptz not null default now()
);

create index if not exists idx_cm_job  on customer_messages(job_id, created_at desc);
create index if not exists idx_cm_type on customer_messages(message_type, created_at desc);


-- 2. billing_review_items — EOD checklist per completed trip
create table if not exists billing_review_items (
  id                    uuid primary key default gen_random_uuid(),
  job_id                uuid not null references dispatch_jobs(id) on delete cascade unique,
  proof_uploaded        boolean not null default false,
  payment_cleared       boolean not null default false,
  driver_payout_set     boolean not null default false,
  incidents_resolved    boolean not null default false,
  manager_note_reviewed boolean not null default false,
  invoice_created       boolean not null default false,
  closed                boolean not null default false,
  closed_by             text,
  closed_at             timestamptz,
  billing_note          text,
  updated_at            timestamptz not null default now()
);

create index if not exists idx_bri_job on billing_review_items(job_id);

-- Auto-create a billing_review_items row when a job moves to billing_review
create or replace function trg_create_billing_review()
returns trigger language plpgsql as $$
begin
  if new.job_status = 'billing_review' and (old.job_status is distinct from 'billing_review') then
    insert into billing_review_items (job_id)
    values (new.id)
    on conflict (job_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_billing_review_create on dispatch_jobs;
create trigger trg_billing_review_create
  after update of job_status on dispatch_jobs
  for each row execute function trg_create_billing_review();


-- 3. RLS
alter table customer_messages      enable row level security;
alter table billing_review_items   enable row level security;

create policy "cm_service"  on customer_messages    for all to service_role using (true) with check (true);
create policy "cm_auth"     on customer_messages    for select to authenticated using (true);
create policy "bri_service" on billing_review_items for all to service_role using (true) with check (true);
create policy "bri_auth"    on billing_review_items for select to authenticated using (true);


-- 4. Verify
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('customer_messages','billing_review_items')
order by table_name;
