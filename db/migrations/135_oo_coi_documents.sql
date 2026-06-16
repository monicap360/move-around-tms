-- Owner Operator COI (Certificate of Insurance) Documents
-- Tracks 9 COI types across 3 groups: standard, ronyx, ma_morrison

create table if not exists public.ronyx_oo_coi_documents (
  id                  uuid primary key default gen_random_uuid(),
  oo_id               uuid not null references public.ronyx_owner_operators(id) on delete cascade,

  coi_group           text not null check (coi_group in ('standard','ronyx','ma_morrison')),
  document_type       text not null,
  -- standard: auto_liability_coi, general_liability_coi, cargo_coi
  -- ronyx: ronyx_contractor_auto_liability_coi, ronyx_contractor_general_liability_coi, ronyx_contractor_cargo_coi
  -- ma_morrison: ma_morrison_auto_liability_coi, ma_morrison_general_liability_coi, ma_morrison_cargo_coi

  insurance_provider  text,
  policy_number       text,
  effective_date      date,
  expiration_date     date,

  file_name           text,
  file_url            text,
  storage_path        text,

  status              text not null default 'needs_review'
                        check (status in ('complete','missing','expired','expiring_soon','needs_review','not_required','rejected')),
  review_status       text not null default 'not_reviewed'
                        check (review_status in ('not_reviewed','approved','rejected','pending_review')),

  dispatch_blocked    boolean not null default false,
  settlement_hold     boolean not null default false,

  customer_requirement text,
  project_requirement  text,

  uploaded_by         text,
  uploaded_at         timestamptz default now(),
  reviewed_by         text,
  reviewed_at         timestamptz,
  last_reminder_sent_at timestamptz,
  notes               text,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),

  unique (oo_id, document_type)
);

create index if not exists idx_ronyx_oo_coi_oo_id      on public.ronyx_oo_coi_documents(oo_id);
create index if not exists idx_ronyx_oo_coi_type        on public.ronyx_oo_coi_documents(document_type);
create index if not exists idx_ronyx_oo_coi_expiration  on public.ronyx_oo_coi_documents(expiration_date);
create index if not exists idx_ronyx_oo_coi_status      on public.ronyx_oo_coi_documents(status);
create index if not exists idx_ronyx_oo_coi_group       on public.ronyx_oo_coi_documents(coi_group);

-- COI Request log (when staff sends request emails)
create table if not exists public.ronyx_oo_coi_requests (
  id                  uuid primary key default gen_random_uuid(),
  oo_id               uuid references public.ronyx_owner_operators(id) on delete cascade,
  coi_group           text not null,
  document_type       text not null,
  request_method      text default 'email',
  recipient_email     text,
  recipient_phone     text,
  status              text default 'sent',
  message             text,
  sent_by             text,
  sent_at             timestamptz default now(),
  completed_at        timestamptz
);

create index if not exists idx_ronyx_oo_coi_req_oo on public.ronyx_oo_coi_requests(oo_id);

-- COI Audit log
create table if not exists public.ronyx_oo_coi_audit (
  id                  uuid primary key default gen_random_uuid(),
  oo_id               uuid references public.ronyx_owner_operators(id) on delete cascade,
  coi_document_id     uuid references public.ronyx_oo_coi_documents(id) on delete set null,
  action              text not null,
  old_status          text,
  new_status          text,
  note                text,
  created_by          text,
  created_at          timestamptz default now()
);

create index if not exists idx_ronyx_oo_coi_audit_oo on public.ronyx_oo_coi_audit(oo_id);
