-- Migration 048: Column Customization for Ticket Views
-- Purpose: Allow users to customize which columns are shown and in what order

create table if not exists ticket_view_customizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  view_name text default 'default', -- 'default', 'mobile', or custom view name
  
  -- Column configuration (JSONB array of column IDs in order)
  visible_columns text[] not null default ARRAY[
    'ticket_number',
    'status',
    'driver',
    'truck',
    'customer',
    'material',
    'quantity',
    'amount',
    'date',
    'actions'
  ],
  
  -- Column widths (optional, JSONB object)
  column_widths jsonb default '{}',
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(user_id, view_name)
);

-- Indexes
create index if not exists idx_ticket_view_custom_user on ticket_view_customizations(user_id);

-- RLS Policies
alter table ticket_view_customizations enable row level security;

create policy "Users can manage their own customizations"
  on ticket_view_customizations
  for all
  using (auth.uid() = user_id);

-- Comments
comment on table ticket_view_customizations is 'User-specific column customizations for ticket views';
comment on column ticket_view_customizations.visible_columns is 'Array of column IDs in display order';
