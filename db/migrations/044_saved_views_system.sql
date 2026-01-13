-- Migration 044: Saved Views System for Tickets
-- Purpose: Allow users to save and share custom filter combinations

create table if not exists saved_ticket_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_shared boolean default false,
  is_quick_filter boolean default false, -- System-defined quick filters (e.g., "Needs Attention")
  quick_filter_type text check (quick_filter_type in ('needs_attention', 'disputed', 'overdue', null)),
  
  -- Filter configuration (JSONB)
  filters jsonb not null default '{}',
  -- Example filters structure:
  -- {
  --   "status": ["pending", "invoiced"],
  --   "dateRange": "week",
  --   "confidence": "low",
  --   "searchTerm": "",
  --   "driverIds": [],
  --   "customerIds": [],
  --   "minAmount": null,
  --   "maxAmount": null,
  --   "sortBy": "created",
  --   "sortOrder": "desc"
  -- }
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  
  unique(user_id, name) -- Each user can have unique view names
);

-- Indexes
create index if not exists idx_saved_views_user on saved_ticket_views(user_id);
create index if not exists idx_saved_views_org on saved_ticket_views(organization_id);
create index if not exists idx_saved_views_shared on saved_ticket_views(is_shared, organization_id);
create index if not exists idx_saved_views_quick_filter on saved_ticket_views(is_quick_filter, quick_filter_type);

-- RLS Policies
alter table saved_ticket_views enable row level security;

-- Users can read their own views and shared views in their organization
create policy "Users can view their own and shared views"
  on saved_ticket_views
  for select
  using (
    auth.uid() = user_id 
    or (is_shared = true and organization_id in (
      select organization_id from user_organizations where user_id = auth.uid()
    ))
  );

-- Users can insert their own views
create policy "Users can create their own views"
  on saved_ticket_views
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own views
create policy "Users can update their own views"
  on saved_ticket_views
  for update
  using (auth.uid() = user_id);

-- Users can delete their own views
create policy "Users can delete their own views"
  on saved_ticket_views
  for delete
  using (auth.uid() = user_id);

-- Helper function to get default quick filters
create or replace function get_quick_filter_filters(filter_type text)
returns jsonb as $$
begin
  case filter_type
    when 'needs_attention' then
      return jsonb_build_object(
        'status', jsonb_build_array('pending'),
        'confidence', 'low',
        'sortBy', 'confidence',
        'sortOrder', 'asc'
      );
    when 'disputed' then
      return jsonb_build_object(
        'status', jsonb_build_array('pending'),
        'searchTerm', 'dispute',
        'sortBy', 'created',
        'sortOrder', 'desc'
      );
    when 'overdue' then
      return jsonb_build_object(
        'status', jsonb_build_array('pending', 'invoiced'),
        'dateRange', 'week',
        'sortBy', 'created',
        'sortOrder', 'asc'
      );
    else
      return '{}'::jsonb;
  end case;
end;
$$ language plpgsql immutable;

-- Comments
comment on table saved_ticket_views is 'Saved filter combinations for ticket views';
comment on column saved_ticket_views.filters is 'JSONB object containing all filter settings';
comment on column saved_ticket_views.is_quick_filter is 'System-defined quick filters available to all users';
comment on column saved_ticket_views.quick_filter_type is 'Type of quick filter (needs_attention, disputed, overdue)';
