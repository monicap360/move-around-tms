-- Migration 047: Evidence Packets System (Sprint 4)
-- Purpose: Auto-assemble evidence packets for disputes and audits

create table if not exists evidence_packets (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('ticket', 'load', 'document')),
  entity_id uuid not null,
  
  -- Packet metadata
  packet_name text,
  generated_at timestamptz default now(),
  generated_by uuid references auth.users(id) on delete set null,
  
  -- Summary data
  confidence_summary jsonb, -- Summary of confidence scores
  anomaly_summary jsonb, -- Summary of anomalies
  narrative_summary text, -- Human-readable narrative
  
  -- Related data references
  related_tickets uuid[], -- Array of related ticket IDs
  related_confidence_events uuid[], -- Array of confidence event IDs
  related_anomaly_events uuid[], -- Array of anomaly event IDs
  
  -- Attachments
  pdf_url text, -- Generated PDF URL
  zip_url text, -- Generated ZIP URL
  
  -- Status
  status text default 'generated' check (status in ('generated', 'downloaded', 'archived')),
  
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_evidence_packets_entity on evidence_packets(entity_type, entity_id);
create index if not exists idx_evidence_packets_generated on evidence_packets(generated_at desc);

-- RLS Policies
alter table evidence_packets enable row level security;

create policy "Users can view evidence packets"
  on evidence_packets
  for select
  using (true); -- Adjust based on your organization structure

-- Comments
comment on table evidence_packets is 'Auto-assembled evidence packets for disputes and audits';
comment on column evidence_packets.narrative_summary is 'Human-readable summary of the evidence';
comment on column evidence_packets.related_tickets is 'Array of related ticket UUIDs';
