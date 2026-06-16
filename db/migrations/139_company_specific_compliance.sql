-- 139_company_specific_compliance.sql
-- Company-Specific Compliance + Driver Company Assignment
-- Adds: compliance_overrides, customer_compliance_rules (with Denesse Group seed),
--       oo_agreements, driver_agreements.
-- Extends: ronyx_driver_documents, drivers/driver_profiles.
-- Connects to: ronyx_owner_operators, ronyx_oo_coi_documents, ronyx_staff_tasks,
--              dispatch_guard, original_uploads.

-- ── 1. Compliance Overrides ─────────────────────────────────────────────────
-- Temporary manager approvals that do not remove a requirement — they badge it.
create table if not exists public.ronyx_compliance_overrides (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid,

  -- Who the override applies to
  owner_operator_id     uuid references public.ronyx_owner_operators(id) on delete set null,
  owner_operator_name   text,
  driver_id             uuid,
  driver_name           text,

  -- What it overrides
  customer_name         text,
  project_name          text,
  requirement_type      text not null,  -- 'document' | 'customer_rule' | 'dispatch_block'
  document_type         text not null,  -- 'cargo_coi' | 'workers_comp' | 'auto_liability' | etc.

  -- Override classification
  override_type         text not null default 'temporary'
                          check (override_type in ('global','customer','project','temporary','one_time')),
  override_reason       text not null,

  -- Approval chain
  approved_by_name      text not null,
  approved_at           timestamptz not null default now(),
  expiration_date       date,

  -- Lifecycle
  status                text not null default 'active'
                          check (status in ('active','expired','revoked','pending_approval')),
  revoked_by_name       text,
  revoked_at            timestamptz,
  revoke_reason         text,

  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_ronyx_co_oo         on public.ronyx_compliance_overrides(owner_operator_id);
create index if not exists idx_ronyx_co_driver      on public.ronyx_compliance_overrides(driver_id);
create index if not exists idx_ronyx_co_customer    on public.ronyx_compliance_overrides(customer_name);
create index if not exists idx_ronyx_co_doc_type    on public.ronyx_compliance_overrides(document_type, status);
create index if not exists idx_ronyx_co_expiration  on public.ronyx_compliance_overrides(expiration_date) where status = 'active';

-- ── 2. Customer Compliance Rules ────────────────────────────────────────────
-- Per-customer document requirements. Configurable by admin.
create table if not exists public.ronyx_customer_compliance_rules (
  id                              uuid primary key default gen_random_uuid(),
  organization_id                 uuid,

  customer_name                   text not null,
  project_name                    text,

  -- COI requirements
  auto_liability_required         boolean not null default true,
  general_liability_required      boolean not null default true,
  cargo_required                  boolean not null default true,
  cargo_override_allowed          boolean not null default false,
  workers_comp_required           boolean not null default false,
  workers_comp_override_allowed   boolean not null default true,

  -- Driver doc requirements
  driver_cdl_required             boolean not null default true,
  driver_medical_card_required    boolean not null default true,
  mvr_required                    boolean not null default true,
  drug_test_required              boolean not null default false,
  background_check_required       boolean not null default false,

  -- Agreement requirements
  loan_agreement_required_if_loan boolean not null default true,

  -- Additional project-specific fields
  notes                           text,
  is_active                       boolean not null default true,

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),

  unique (customer_name, project_name)
);

create index if not exists idx_ronyx_ccr_customer  on public.ronyx_customer_compliance_rules(customer_name);
create index if not exists idx_ronyx_ccr_active     on public.ronyx_customer_compliance_rules(is_active);

-- Seed: Denesse Group default profile
insert into public.ronyx_customer_compliance_rules (
  customer_name, auto_liability_required, general_liability_required,
  cargo_required, cargo_override_allowed,
  workers_comp_required, workers_comp_override_allowed,
  driver_cdl_required, driver_medical_card_required, mvr_required,
  loan_agreement_required_if_loan,
  notes
) select
  'Denesse Group', true, true,
  true,  true,
  false, true,
  true,  true, true,
  true,
  'Default Denesse Group compliance profile. Cargo and Workers Comp may be approved as manager overrides when permitted by project.'
where not exists (
  select 1 from public.ronyx_customer_compliance_rules
  where customer_name = 'Denesse Group' and project_name is null
);

-- ── 3. Owner Operator Agreements ────────────────────────────────────────────
create table if not exists public.ronyx_oo_agreements (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid,
  owner_operator_id    uuid not null references public.ronyx_owner_operators(id) on delete cascade,
  owner_operator_name  text,

  agreement_type       text not null default 'owner_operator_loan_agreement',
  agreement_date       date,

  -- Loan terms
  loan_amount          numeric(12,2) not null default 0,
  deduction_amount     numeric(12,2) not null default 0,
  deduction_frequency  text,          -- 'per_settlement' | 'weekly' | 'bi_weekly'
  balance              numeric(12,2) not null default 0,

  status               text not null default 'active'
                         check (status in ('active','paid_off','cancelled','voided')),

  -- File storage
  file_name            text,
  file_url             text,
  storage_path         text,
  original_upload_id   uuid references public.original_uploads(id) on delete set null,

  -- Review chain
  uploaded_by          text,
  reviewed_by          text,
  reviewed_at          timestamptz,

  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_ronyx_ooa_oo      on public.ronyx_oo_agreements(owner_operator_id);
create index if not exists idx_ronyx_ooa_status  on public.ronyx_oo_agreements(status);

-- ── 4. Driver Agreements ────────────────────────────────────────────────────
create table if not exists public.ronyx_driver_agreements (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid,
  driver_id               uuid not null,
  driver_name             text,

  company_name            text,
  owner_operator_id       uuid references public.ronyx_owner_operators(id) on delete set null,

  agreement_type          text not null default 'driver_loan_agreement',
  agreement_date          date,

  -- Loan terms
  loan_amount             numeric(12,2) not null default 0,
  deduction_amount        numeric(12,2) not null default 0,
  deduction_frequency     text,
  balance                 numeric(12,2) not null default 0,
  payroll_deduction_active boolean not null default false,

  status                  text not null default 'active'
                            check (status in ('active','paid_off','cancelled','voided')),

  -- File storage
  file_name               text,
  file_url                text,
  storage_path            text,
  original_upload_id      uuid references public.original_uploads(id) on delete set null,

  -- Review chain
  uploaded_by             text,
  reviewed_by             text,
  reviewed_at             timestamptz,

  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_ronyx_da_driver  on public.ronyx_driver_agreements(driver_id);
create index if not exists idx_ronyx_da_status  on public.ronyx_driver_agreements(status);

-- ── 5. Extend ronyx_driver_documents ────────────────────────────────────────
-- Existing table (migration 123) has driver_id, doc_type, file_url, status,
-- expires_on, uploaded_by, organization_id. We add compliance fields.
alter table public.ronyx_driver_documents
  add column if not exists company_name        text,
  add column if not exists owner_operator_id   uuid references public.ronyx_owner_operators(id) on delete set null,
  add column if not exists document_label      text,
  add column if not exists effective_date      date,
  add column if not exists original_upload_id  uuid references public.original_uploads(id) on delete set null,
  add column if not exists review_status       text not null default 'not_reviewed',
  add column if not exists reviewed_by         text,
  add column if not exists reviewed_at         timestamptz;

-- ── 6. Extend drivers / driver_profiles ────────────────────────────────────
-- Extend public.drivers (used by ronyx_driver_documents FK and drivers page)
alter table public.drivers
  add column if not exists employment_type    text default 'W2 Driver',
  add column if not exists carrier_name       text,
  add column if not exists owner_operator_id  uuid references public.ronyx_owner_operators(id) on delete set null,
  add column if not exists dispatch_eligible  boolean not null default false,
  add column if not exists payroll_eligible   boolean not null default false,
  add column if not exists compliance_status  text not null default 'needs_review',
  add column if not exists block_reason       text;

-- Also extend driver_profiles (HR/payroll side, already has company_name from 099)
alter table public.driver_profiles
  add column if not exists employment_type    text default 'W2 Driver',
  add column if not exists carrier_name       text,
  add column if not exists owner_operator_id  uuid references public.ronyx_owner_operators(id) on delete set null,
  add column if not exists dispatch_eligible  boolean not null default false,
  add column if not exists payroll_eligible   boolean not null default false,
  add column if not exists compliance_status  text not null default 'needs_review',
  add column if not exists block_reason       text;

-- ── 7. Upsert index for compliance overrides ─────────────────────────────────
-- One active override per (target entity, document_type, customer scope)
create unique index if not exists ronyx_co_active_upsert_idx
  on public.ronyx_compliance_overrides (
    coalesce(owner_operator_id::text, ''),
    coalesce(driver_id::text, ''),
    document_type,
    coalesce(customer_name, '')
  )
  where status = 'active';

-- ── 8. Auto-expire overrides past expiration_date ────────────────────────────
-- Run this periodically (or call from API on read):
-- update public.ronyx_compliance_overrides
--   set status = 'expired', updated_at = now()
-- where status = 'active' and expiration_date < current_date;
-- (Kept as comment — run via cron or on-read check in application layer)
