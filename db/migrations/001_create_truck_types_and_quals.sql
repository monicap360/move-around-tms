-- Migration: create truck_types and driver_qualifications tables

create table if not exists truck_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  required_license text
);

alter table if exists trucks
  add column if not exists truck_type uuid references truck_types(id);

create table if not exists driver_qualifications (
  driver_id uuid references drivers(id),
  truck_type uuid references truck_types(id),
  qualified boolean default true,
  primary key (driver_id, truck_type)
);
