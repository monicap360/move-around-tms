-- Migration 049: AI validation engine tables

create table if not exists public.ai_validation_rules (
  rule_id bigserial primary key,
  rule_type text not null check (rule_type in ('distance', 'weight', 'time', 'location', 'photo', 'signature')),
  rule_name text not null,
  rule_logic jsonb not null default '{}'::jsonb,
  threshold numeric(10, 2),
  severity text not null check (severity in ('warning', 'error', 'block')),
  auto_correct boolean not null default false,
  project_specific boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_validation_log (
  validation_id bigserial primary key,
  ticket_id text,
  validation_type text not null,
  validation_status text not null check (validation_status in ('passed', 'failed', 'corrected', 'override')),
  rule_id bigint references public.ai_validation_rules(rule_id),
  actual_value numeric(12, 4),
  expected_value numeric(12, 4),
  variance_percent numeric(5, 2),
  confidence_score numeric(5, 4),
  auto_corrected_value numeric(12, 4),
  corrected_by bigint,
  correction_note text,
  validation_timestamp timestamptz not null default now()
);

create index if not exists idx_ticket_validations
  on public.ticket_validation_log (ticket_id, validation_type);

create table if not exists public.location_geofences (
  geofence_id bigserial primary key,
  project_id text,
  location_type text not null check (location_type in ('pickup', 'dump', 'scale', 'yard')),
  location_name text not null,
  address text,
  center_lat numeric(10, 8),
  center_lon numeric(11, 8),
  radius_miles numeric(5, 2) not null default 0.25,
  polygon_coordinates jsonb,
  requires_photo boolean not null default true,
  requires_signature boolean not null default true,
  allowed_materials jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_geofences
  on public.location_geofences (project_id, location_type);
