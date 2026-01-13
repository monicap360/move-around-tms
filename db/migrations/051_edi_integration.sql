-- Migration 051: EDI Integration System
-- Purpose: Support EDI document processing (204, 210, 214, 997)

create table if not exists edi_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('204', '210', '214', '997', '990', '211')),
  direction text not null check (direction in ('inbound', 'outbound')),
  trading_partner_id text, -- Customer or carrier identifier
  trading_partner_name text,
  control_number text not null, -- EDI control number
  interchange_control_number text,
  functional_group_id text,
  transaction_set_id text,
  status text default 'received' check (status in ('received', 'processed', 'acknowledged', 'error', 'rejected')),
  raw_content text, -- Raw EDI content
  parsed_data jsonb, -- Parsed EDI data
  error_message text,
  processed_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, control_number, document_type)
);

-- EDI mappings (map EDI fields to TMS fields)
create table if not exists edi_field_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trading_partner_id text,
  document_type text not null,
  edi_field_path text not null, -- e.g., "N1*SH*ABC Company"
  tms_field text not null, -- e.g., "customer_name"
  transformation_rule jsonb, -- Optional transformation rules
  created_at timestamptz default now()
);

-- EDI acknowledgments (997 functional acknowledgments)
create table if not exists edi_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  original_document_id uuid references edi_documents(id) on delete cascade,
  acknowledgment_type text not null check (acknowledgment_type in ('997', 'TA1')),
  status_code text, -- A = Accepted, E = Error, R = Rejected
  status_description text,
  acknowledgment_content text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_edi_documents_org on edi_documents(organization_id);
create index if not exists idx_edi_documents_type on edi_documents(document_type);
create index if not exists idx_edi_documents_status on edi_documents(status);
create index if not exists idx_edi_documents_partner on edi_documents(trading_partner_id);
create index if not exists idx_edi_mappings_org on edi_field_mappings(organization_id);

-- RLS Policies
alter table edi_documents enable row level security;
alter table edi_field_mappings enable row level security;
alter table edi_acknowledgments enable row level security;

create policy "Users can view EDI documents"
  on edi_documents
  for select
  using (true); -- Adjust based on organization structure

-- Comments
comment on table edi_documents is 'EDI documents (204, 210, 214, 997, etc.)';
comment on table edi_field_mappings is 'Mappings from EDI fields to TMS fields';
comment on table edi_acknowledgments is 'EDI functional acknowledgments (997)';
