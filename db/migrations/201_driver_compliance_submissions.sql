-- Driver self-service compliance submissions
-- Stores every submission from the /driver-compliance portal.
-- Status: pending_match (driver not found), applied (driver matched + profile updated), reviewed (office confirmed).

create table if not exists ronyx_driver_compliance_submissions (
  id                              uuid primary key default gen_random_uuid(),
  driver_profile_id               uuid references driver_profiles(id) on delete set null,

  -- Identity
  full_name                       text not null,
  truck_number                    text,
  phone                           text,
  home_address                    text,

  -- Emergency contact
  emergency_contact_name          text,
  emergency_contact_phone         text,
  emergency_contact_relationship  text,

  -- CDL
  cdl_number                      text,
  cdl_class                       text,
  cdl_state                       text,
  cdl_expiration                  date,

  -- Medical / drug
  medical_card_expiration         date,
  drug_test_date                  date,

  -- Document storage URLs
  cdl_front_url                   text,
  cdl_back_url                    text,
  medical_card_url                text,

  -- Workflow
  status                          text not null default 'pending_match'
                                    check (status in ('pending_match','applied','reviewed','rejected')),
  reviewed_by                     text,
  reviewed_at                     timestamptz,
  review_notes                    text,

  submitted_at                    timestamptz not null default now(),
  created_at                      timestamptz not null default now()
);

-- Index for office compliance review screen
create index if not exists idx_drv_compliance_status   on ronyx_driver_compliance_submissions(status, submitted_at desc);
create index if not exists idx_drv_compliance_profile  on ronyx_driver_compliance_submissions(driver_profile_id);

-- RLS: service-role only (anon users cannot read submissions)
alter table ronyx_driver_compliance_submissions enable row level security;
create policy "service_role_full" on ronyx_driver_compliance_submissions
  using (true) with check (true);
