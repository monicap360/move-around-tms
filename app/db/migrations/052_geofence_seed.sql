-- Migration 052: Seed location geofences (global defaults)

insert into public.location_geofences (
  project_id,
  location_type,
  location_name,
  address,
  center_lat,
  center_lon,
  radius_miles,
  requires_photo,
  requires_signature,
  allowed_materials,
  active
)
select
  v.project_id,
  v.location_type,
  v.location_name,
  v.address,
  v.center_lat,
  v.center_lon,
  v.radius_miles,
  v.requires_photo,
  v.requires_signature,
  v.allowed_materials,
  true
from (
  values
    (
      null,
      'pickup',
      'Default Pickup Yard',
      '123 Yard Way',
      29.7604,
      -95.3698,
      0.35,
      true,
      false,
      '["dirt","gravel","asphalt","concrete"]'::jsonb
    ),
    (
      null,
      'dump',
      'Default Dump Site',
      '987 Quarry Rd',
      29.7752,
      -95.3281,
      0.5,
      true,
      true,
      '["dirt","gravel","demolition"]'::jsonb
    )
) as v(
  project_id,
  location_type,
  location_name,
  address,
  center_lat,
  center_lon,
  radius_miles,
  requires_photo,
  requires_signature,
  allowed_materials
)
where not exists (
  select 1
  from public.location_geofences g
  where g.location_type = v.location_type
    and g.location_name = v.location_name
);
