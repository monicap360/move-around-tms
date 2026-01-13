-- Migration 045: Exception Queue System (Sprint 2)
-- Purpose: Ranked exception queue with priority scoring

create table if not exists exception_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('ticket', 'load', 'document')),
  entity_id uuid not null,
  
  -- Priority scoring
  impact_score numeric(5,2) not null default 0, -- Financial impact (0-100)
  confidence_score numeric(5,2) not null default 0, -- Data confidence (0-1)
  priority_rank numeric(10,2) generated always as (impact_score * confidence_score) stored,
  
  -- Exception details
  exception_type text not null, -- e.g., 'weight_mismatch', 'rate_discrepancy', 'low_confidence'
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  recommended_action text,
  explanation text,
  
  -- Related data
  related_anomaly_id uuid references anomaly_events(id) on delete set null,
  related_confidence_event_id uuid references data_confidence_events(id) on delete set null,
  
  -- Status tracking
  status text default 'open' check (status in ('open', 'in_review', 'resolved', 'auto_resolved', 'dismissed')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_exception_queue_status on exception_queue(status);
create index if not exists idx_exception_queue_priority on exception_queue(priority_rank desc, status);
create index if not exists idx_exception_queue_entity on exception_queue(entity_type, entity_id);
create index if not exists idx_exception_queue_severity on exception_queue(severity, status);
create index if not exists idx_exception_queue_assigned on exception_queue(assigned_to, status) where assigned_to is not null;

-- RLS Policies
alter table exception_queue enable row level security;

-- Users can view exceptions in their organization
create policy "Users can view exceptions"
  on exception_queue
  for select
  using (true); -- Adjust based on your organization structure

-- Users can update exceptions (assign, resolve)
create policy "Users can update exceptions"
  on exception_queue
  for update
  using (true);

-- Auto-update timestamp
create or replace function update_exception_queue_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_exception_queue_timestamp
  before update on exception_queue
  for each row
  execute function update_exception_queue_updated_at();

-- Helper function to calculate impact score
create or replace function calculate_impact_score(
  entity_type text,
  entity_id uuid,
  exception_type text
)
returns numeric as $$
declare
  impact numeric;
begin
  -- Calculate financial impact based on exception type
  case exception_type
    when 'weight_mismatch' then
      -- Impact based on ticket value
      select coalesce((total_bill * 0.1), 0) into impact
      from aggregate_tickets
      where id = entity_id and entity_type = 'ticket'
      limit 1;
      
    when 'rate_discrepancy' then
      -- Impact based on rate difference
      select coalesce(abs(total_bill - total_pay) * 0.2, 0) into impact
      from aggregate_tickets
      where id = entity_id and entity_type = 'ticket'
      limit 1;
      
    when 'low_confidence' then
      -- Impact based on ticket value and confidence
      select coalesce(total_bill * (1 - 0.7), 0) into impact
      from aggregate_tickets
      where id = entity_id and entity_type = 'ticket'
      limit 1;
      
    else
      impact := 10; -- Default impact
  end case;
  
  -- Normalize to 0-100 scale
  return least(100, greatest(0, impact));
end;
$$ language plpgsql;

-- Function to auto-create exceptions from anomalies
create or replace function create_exception_from_anomaly()
returns trigger as $$
declare
  impact numeric;
  confidence numeric;
  priority numeric;
begin
  -- Calculate impact score
  impact := calculate_impact_score(new.entity_type, new.entity_id, new.anomaly_type);
  
  -- Get confidence score from related confidence event
  if new.entity_type = 'ticket' then
    select avg(confidence_score) into confidence
    from data_confidence_events
    where entity_type = 'ticket'
      and entity_id = new.entity_id
      and created_at >= now() - interval '1 hour';
  else
    confidence := 0.5; -- Default
  end if;
  
  -- Calculate priority
  priority := impact * coalesce(confidence, 0.5);
  
  -- Only create exception if priority is above threshold (configurable, default 5)
  if priority >= 5 then
    insert into exception_queue (
      entity_type,
      entity_id,
      impact_score,
      confidence_score,
      exception_type,
      severity,
      explanation,
      related_anomaly_id
    ) values (
      new.entity_type,
      new.entity_id,
      impact,
      coalesce(confidence, 0.5),
      new.anomaly_type,
      case
        when priority >= 50 then 'critical'
        when priority >= 25 then 'high'
        when priority >= 10 then 'medium'
        else 'low'
      end,
      new.explanation,
      new.id
    );
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-create exceptions when anomalies are detected
create trigger create_exception_on_anomaly
  after insert on anomaly_events
  for each row
  execute function create_exception_from_anomaly();

-- Function to auto-resolve low priority exceptions
create or replace function auto_resolve_low_priority_exceptions()
returns void as $$
begin
  update exception_queue
  set status = 'auto_resolved',
      resolved_at = now(),
      resolution_notes = 'Auto-resolved: Priority below threshold'
  where status = 'open'
    and priority_rank < 5
    and created_at < now() - interval '24 hours';
end;
$$ language plpgsql;

-- Comments
comment on table exception_queue is 'Ranked queue of exceptions requiring attention';
comment on column exception_queue.priority_rank is 'Calculated as impact_score × confidence_score';
comment on column exception_queue.impact_score is 'Financial impact (0-100 scale)';
comment on column exception_queue.confidence_score is 'Data confidence (0-1 scale)';
