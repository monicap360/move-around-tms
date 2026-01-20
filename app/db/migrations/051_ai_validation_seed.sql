-- Migration 051: Seed AI validation rules

insert into public.ai_validation_rules (
  rule_type,
  rule_name,
  rule_logic,
  threshold,
  severity,
  auto_correct,
  project_specific,
  active
)
select
  v.rule_type,
  v.rule_name,
  v.rule_logic,
  v.threshold,
  v.severity,
  v.auto_correct,
  v.project_specific,
  true
from (
  values
    (
      'distance',
      'Max Haul Distance',
      '{"max_miles": 50}'::jsonb,
      50.00,
      'error',
      false,
      true
    ),
    (
      'weight',
      'Overload Prevention',
      '{"max_tons": 25, "truck_capacity_field": "capacity_tons"}'::jsonb,
      25.00,
      'block',
      false,
      false
    ),
    (
      'time',
      'Round Trip Time Check',
      '{"avg_speed_mph": 30, "max_hours_per_trip": 3}'::jsonb,
      3.00,
      'warning',
      true,
      true
    ),
    (
      'location',
      'Dump Site Verification',
      '{"required_geofence": true, "allowed_radius_miles": 0.5}'::jsonb,
      0.50,
      'block',
      false,
      true
    ),
    (
      'photo',
      'Required Load Photos',
      '{"requires_photo": true}'::jsonb,
      null,
      'warning',
      false,
      true
    ),
    (
      'signature',
      'Required Signature',
      '{"requires_signature": true}'::jsonb,
      null,
      'warning',
      false,
      true
    )
) as v(rule_type, rule_name, rule_logic, threshold, severity, auto_correct, project_specific)
where not exists (
  select 1
  from public.ai_validation_rules r
  where r.rule_type = v.rule_type
    and r.rule_name = v.rule_name
);
