-- Migration 227: schema reconciliation — add columns/tables the code writes that the live DB is missing.
-- AUTO-GENERATED from a diff of the app code vs the actual schema. Non-destructive
-- (IF NOT EXISTS). Types are best-effort; adjust later if a field needs a precise type.

create table if not exists public.schema_migrations (version bigint primary key, name text, applied_at timestamptz not null default now());

-- ── Missing COLUMNS on existing tables ──────────────────────────────────────
alter table if exists public.aggregate_tickets
  add column if not exists payment_status text,
  add column if not exists invoice_number text;
alter table if exists public.compliance_notifications
  add column if not exists sent_at timestamptz;
alter table if exists public.dispatch_imports
  add column if not exists ready_rows text,
  add column if not exists critical_rows text,
  add column if not exists needs_review_rows text,
  add column if not exists matched_rows text,
  add column if not exists parsed_at timestamptz,
  add column if not exists status text,
  add column if not exists to_pickup_count numeric,
  add column if not exists to_dropoff_count numeric;
alter table if exists public.driver_compliance_audit_log
  add column if not exists driver_name text,
  add column if not exists action text,
  add column if not exists reason text,
  add column if not exists performed_by text;
alter table if exists public.drivers
  add column if not exists resume_json jsonb,
  add column if not exists resume_last_generated text,
  add column if not exists logo_url text,
  add column if not exists photo_url text;
alter table if exists public.fast_scan_uploads
  add column if not exists file_name text,
  add column if not exists upload_status text;
alter table if exists public.integration_connections
  add column if not exists last_synced_at timestamptz,
  add column if not exists metadata jsonb;
alter table if exists public.load_requests
  add column if not exists updated_at timestamptz;
alter table if exists public.loads
  add column if not exists driver_uuid text,
  add column if not exists assigned_at timestamptz;
alter table if exists public.maintenance_work_orders
  add column if not exists unit_id text,
  add column if not exists issue text,
  add column if not exists opened_date text,
  add column if not exists vendor text,
  add column if not exists notes text;
alter table if exists public.manual_payment_logs
  add column if not exists status text,
  add column if not exists submitted_at timestamptz,
  add column if not exists verified_at timestamptz;
alter table if exists public.organization_custom_fields
  add column if not exists help_text text;
alter table if exists public.organization_modules
  add column if not exists is_active boolean;
alter table if exists public.organizations
  add column if not exists enable_mexican_compliance boolean;
alter table if exists public.original_uploads
  add column if not exists related_import_id text,
  add column if not exists related_table text,
  add column if not exists module text,
  add column if not exists source_file_name text,
  add column if not exists file_type text,
  add column if not exists is_original boolean,
  add column if not exists is_deleted boolean,
  add column if not exists notes text,
  add column if not exists storage_bucket text,
  add column if not exists file_size text,
  add column if not exists upload_status text,
  add column if not exists upload_source text,
  add column if not exists entity_type text,
  add column if not exists uploaded_by text;
alter table if exists public.owner_operators
  add column if not exists updated_at timestamptz;
alter table if exists public.page_protection_logs
  add column if not exists page_url text,
  add column if not exists staff_name text,
  add column if not exists user_agent text;
alter table if exists public.payout_import_batches
  add column if not exists import_name text,
  add column if not exists project_name text,
  add column if not exists week_start text,
  add column if not exists week_end text,
  add column if not exists oos_created text,
  add column if not exists grand_total numeric,
  add column if not exists jobs_created text;
alter table if exists public.payroll_holds
  add column if not exists hold_reason text,
  add column if not exists hold_type text,
  add column if not exists held_by text;
alter table if exists public.payroll_items
  add column if not exists driver_name text,
  add column if not exists related_job_id text,
  add column if not exists job_number text,
  add column if not exists description text,
  add column if not exists gross_amount numeric,
  add column if not exists status text,
  add column if not exists hold_reason text,
  add column if not exists source text,
  add column if not exists related_ticket_id text,
  add column if not exists related_scan_id text,
  add column if not exists created_by text;
alter table if exists public.platform_admin_audit_log
  add column if not exists actor_id text,
  add column if not exists actor_email text,
  add column if not exists org_id text,
  add column if not exists event_type text,
  add column if not exists details jsonb;
alter table if exists public.ronyx_admin_audit_logs
  add column if not exists performed_by text,
  add column if not exists details jsonb;
alter table if exists public.ronyx_driver_compliance_submissions
  add column if not exists status text;
alter table if exists public.ronyx_driver_events
  add column if not exists truck_id text;
alter table if exists public.ronyx_driver_truck_assignments
  add column if not exists assigned_by text;
alter table if exists public.ronyx_loads
  add column if not exists received_at timestamptz;
alter table if exists public.ronyx_oo_documents
  add column if not exists status text;
alter table if exists public.ronyx_oo_subcontractor_drivers
  add column if not exists sub_id text,
  add column if not exists oo_id text,
  add column if not exists name text,
  add column if not exists cdl_number text,
  add column if not exists cdl_expiration text;
alter table if exists public.ronyx_oo_subcontractors
  add column if not exists mc_number text,
  add column if not exists dot_number text;
alter table if exists public.ronyx_owner_operators
  add column if not exists logo_url text;
alter table if exists public.ronyx_payroll_items
  add column if not exists event_type text,
  add column if not exists to_status text,
  add column if not exists trigger_ref text,
  add column if not exists new_values jsonb,
  add column if not exists approved_at timestamptz,
  add column if not exists hold_reason text;
alter table if exists public.ronyx_staff_tasks
  add column if not exists assigned_to text,
  add column if not exists action text;
alter table if exists public.subscriptions
  add column if not exists days text,
  add column if not exists expires_at timestamptz;
alter table if exists public.ticket_audit_log
  add column if not exists created text,
  add column if not exists updated text,
  add column if not exists completed text,
  add column if not exists ticket_number text,
  add column if not exists payroll_hold text,
  add column if not exists billing_hold text,
  add column if not exists qr_token text,
  add column if not exists qr_url text;
alter table if exists public.tickets
  add column if not exists description text,
  add column if not exists priority text,
  add column if not exists source text,
  add column if not exists impact text,
  add column if not exists related_job_id text,
  add column if not exists related_driver_id text,
  add column if not exists related_vehicle_id text,
  add column if not exists scan_type text,
  add column if not exists payroll_hold_reason text,
  add column if not exists estimated_driver_pay numeric,
  add column if not exists created_by text,
  add column if not exists related_payroll_item_id text,
  add column if not exists related_wo_id text,
  add column if not exists assigned_to text,
  add column if not exists due_date text,
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size text,
  add column if not exists file_type text;

-- ── Missing TABLES (minimal: id + organization_id + written columns + timestamps) ─
create table if not exists public.account_plan (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.accounting_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  access_token text,
  refresh_token text,
  realm_id text,
  tenant_id text,
  expires_at timestamptz,
  active boolean,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.accounting_sync_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  items_count numeric,
  success_count numeric,
  error_count numeric,
  status text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.accuriscale_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.accuriscale_loads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.aggregate_master_loads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.aggregate_material_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.aggregate_tolerance_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_contract_analysis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_excel_compare_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_payroll_analysis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_ticket_forensics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text,
  key_hash text,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.carrier_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  carrier_id text,
  lane_origin text,
  lane_destination text,
  unit_type text,
  rate numeric,
  effective_from text,
  effective_to text,
  fuel_surcharge text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text,
  mc_number text,
  dot_number text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.customer_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  customer_name text,
  invoice_date text,
  invoice_status text,
  ar_status text,
  ticket_count numeric,
  invoice_total numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id text,
  direction text,
  message_type text,
  body text,
  sent_to text,
  status text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.detention_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  detention_event_id text,
  carrier_id text,
  load_reference text,
  ticket_id text,
  status text,
  claimed_minutes numeric,
  free_minutes numeric,
  rate_per_hour text,
  claim_amount numeric,
  currency text,
  evidence jsonb,
  photo_urls jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.detention_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  facility_name text,
  arrived_at timestamptz,
  departed_at timestamptz,
  total_minutes numeric,
  source text,
  geofence_id text,
  load_reference text,
  ticket_id text,
  carrier_id text,
  driver_id text,
  truck_id text,
  metadata jsonb,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dictated_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  session_id text,
  dispatcher_id text,
  driver_id text,
  load_id text,
  message_text text,
  original_transcription text,
  message_length text,
  delivery_method text,
  system_voice_enabled boolean,
  status text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dictation_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  dispatcher_id text,
  action text,
  session_id text,
  transcribed_text text,
  metadata jsonb,
  message_id text,
  driver_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dictation_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  edited_text text,
  reviewed boolean,
  dispatcher_id text,
  transcribed_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dispatch_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id text,
  driver_id text,
  vehicle_id text,
  assigned_by text,
  acceptance_status text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dispatch_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id text,
  driver_id text,
  incident_type text,
  description text,
  severity text,
  created_by text,
  is_resolved boolean,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dispatch_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id text,
  body text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  license_type text,
  resume_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.driver_hr_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  driver_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.driver_network_unlocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  anonymous_driver_id text,
  status text,
  payment_status text,
  unlock_fee_cents text,
  paid_at timestamptz,
  approved_at timestamptz,
  identity_released text,
  contact_released text,
  resume_released text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  driver_profile_id text,
  full_name text,
  truck_number text,
  phone text,
  home_address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  cdl_number text,
  cdl_class text,
  cdl_state text,
  cdl_expiration text,
  medical_card_expiration text,
  drug_test_date text,
  cdl_front_url text,
  cdl_back_url text,
  medical_card_url text,
  status text,
  submitted_at timestamptz,
  network_status text,
  dispatch_eligible text,
  driver_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.driver_settlement_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  dispute_notes text,
  driver_proposed_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.driver_weekly_payroll_summary (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  driver_id text,
  driver_name text,
  week_start_friday text,
  total_pay numeric,
  total_tickets text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dvir (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dvir_defects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  is_corrected boolean,
  corrected_at timestamptz,
  corrected_by text,
  correction_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.dvir_inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  odometer_reading text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.edi_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  direction text,
  trading_partner_id text,
  control_number text,
  raw_content text,
  parsed_data jsonb,
  status text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.eld_device_status (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  driver_id text,
  truck_id text,
  last_lat text,
  last_lng text,
  last_status text,
  last_timestamp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.eld_trip_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  trip_id text,
  jurisdiction_code text,
  miles text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.eld_trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  truck_id text,
  start_time text,
  end_time text,
  total_miles text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.esign_envelopes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  related_id text,
  original_pdf_path text,
  status text,
  signed_pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.esign_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  envelope_id text,
  recipient_id text,
  event_type text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.esign_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.evidence_packets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  entity_type text,
  entity_id text,
  packet_name text,
  generated_by text,
  confidence_summary text,
  anomaly_summary text,
  narrative_summary text,
  related_tickets text,
  related_confidence_events text,
  related_anomaly_events text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.exception_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.factoring_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fastscan_uploads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  file_name text,
  file_path text,
  file_url text,
  file_size text,
  ocr_result text,
  status text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fleetpulse_driver_day (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fleetpulse_idle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fleetpulse_pit_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fleetpulse_truck_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fuel_purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.geofence_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  acknowledged text,
  acknowledged_by text,
  acknowledged_at timestamptz,
  geofence_id text,
  vehicle_id text,
  driver_id text,
  truck_id text,
  event_type text,
  location text,
  speed text,
  heading text,
  timestamp text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text,
  description text,
  radius text,
  rules text,
  active boolean,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ifta_filing_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  reporting_period_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ifta_fuel_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ifta_jurisdiction_miles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  verification_status text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ifta_quarter_filings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ifta_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ifta_reporting_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  readiness_percent text,
  status text,
  locked_at timestamptz,
  locked_by text,
  filed_at timestamptz,
  filed_by text,
  filing_confirmation_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.intel_verify_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  org_id text,
  approved_field_count numeric,
  rejected_field_count numeric,
  approved_by_user text,
  approved_by_name text,
  oo_fields_updated text,
  ccb_tasks_created text,
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.intel_verify_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  approved_by text,
  approved_at timestamptz,
  approved_fields text,
  rejected_fields text,
  org_id text,
  oo_id text,
  upload_id text,
  file_name text,
  file_type text,
  doc_type text,
  extracted_fields text,
  raw_text_preview text,
  high_confidence_count numeric,
  low_confidence_count numeric,
  extraction_error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.invoice_ticket_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  source_name text,
  file_name text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  driver_id text,
  driver_uuid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.maintenance_activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  unit_id text,
  work_order_id text,
  action text,
  old_value text,
  new_value text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.maintenance_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  unit_id text,
  work_order_id text,
  document_type text,
  file_name text,
  file_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.maintenance_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  unit_number text,
  unit_type text,
  vin text,
  plate text,
  assigned_driver_id text,
  odometer text,
  last_service_date text,
  next_service_date text,
  next_service_miles text,
  registration_expires text,
  insurance_expires text,
  annual_inspection_expires text,
  status text,
  dispatch_eligible text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.material_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  unit_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.org_excel_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  file_name text,
  storage_path text,
  file_size_bytes text,
  data_type text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_ai_assistants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  custom_name text,
  greeting text,
  tone text,
  is_enabled boolean,
  avatar_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  key_prefix text,
  scopes text,
  is_active boolean,
  revoked_at timestamptz,
  revoked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_import_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  column_map text,
  static_values text,
  transform_rules text,
  is_default boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  parent_organization_id text,
  child_organization_id text,
  relationship_type text,
  active boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  events text,
  secret_hash text,
  is_active boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.override_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  override_type text,
  days text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.payroll_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  contractor_name text,
  truck_number text,
  payroll_week_start text,
  payroll_week_end text,
  status text,
  deduction_total numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.payroll_job_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id text,
  event_type text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.payroll_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  failure_reason text,
  requested_by text,
  priority text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.payroll_tax_filings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pit_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  vendor_name text,
  invoice_number text,
  invoice_date text,
  total_tons text,
  total_amount numeric,
  pit_location text,
  material text,
  po_number text,
  file_url text,
  status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  company text,
  phone text,
  details jsonb,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_ach_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  recipient_name text,
  company_name text,
  email text,
  created_by text,
  status text,
  signature text,
  signed_name text,
  signed_title text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_billing_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  invoice_id text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_compliance_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  company_name text,
  customer_id text,
  contract_type text,
  status text,
  start_date text,
  end_date text,
  rate_type text,
  rate_amount numeric,
  material_type text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  signed_date text,
  signed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_customer_compliance_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_customer_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_driver_deductions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_driver_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  driver_name text,
  status text,
  notes text,
  ticket_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_implementation_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  import_count numeric,
  error_count numeric,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  invoice_number text,
  customer_name text,
  status text,
  payment_status text,
  accounting_status text,
  issued_date text,
  due_date text,
  total_amount numeric,
  ticket_ids text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_job_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_maintenance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  oo_id text,
  truck_id text,
  truck_number text,
  oo_company_name text,
  event_type text,
  severity text,
  issue_title text,
  issue_description text,
  status text,
  out_of_service text,
  out_of_service_at timestamptz,
  estimated_return_at timestamptz,
  reported_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_module_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  title text,
  subtitle text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_payroll_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  payroll_item_id text,
  driver_id text,
  event_type text,
  from_status text,
  to_status text,
  trigger_ref text,
  old_values text,
  new_values jsonb,
  period_id text,
  driver_name text,
  trigger_source text,
  performed_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  total_gross_pay numeric,
  total_deductions text,
  total_reimbursements text,
  total_net_pay numeric,
  driver_count numeric,
  ticket_count numeric,
  items_ready text,
  items_needing_review text,
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_payroll_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_payroll_validations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_subhauler_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  subhauler_name text,
  subhauler_address text,
  subhauler_attn text,
  subhauler_phone text,
  subhauler_email text,
  subhauler_usdot text,
  trucks text,
  commencement_day text,
  commencement_month text,
  commencement_year text,
  completion_day text,
  completion_month text,
  completion_year text,
  general_contractor text,
  gc_address text,
  project_name text,
  prime_carrier_sig text,
  prime_carrier_signed_by text,
  prime_carrier_signed_at timestamptz,
  status text,
  created_by text,
  subhauler_sig text,
  subhauler_signed_by text,
  subhauler_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ronyx_truck_reassignment_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  oo_id text,
  driver_id text,
  old_truck_id text,
  new_truck_id text,
  driver_name text,
  old_truck_number text,
  new_truck_number text,
  reason text,
  reassigned_by text,
  manager_override text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.safety_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.saved_ticket_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  is_shared boolean,
  is_quick_filter boolean,
  quick_filter_type text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  file_name text,
  file_path text,
  file_url text,
  file_size text,
  ocr_data jsonb,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  is_active boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_leg_financials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  leg_id text,
  pay_rate numeric,
  bill_rate numeric,
  quantity numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_legs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  ticket_id text,
  latitude text,
  longitude text,
  quantity numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_view_customizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  column_widths text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_workflow_executions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  ticket_id text,
  action_taken text,
  reason text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ticket_workflow_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  rule_name text,
  action text,
  priority text,
  rule_condition text,
  active boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tms_incident_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  incident_id text,
  source text,
  event_type text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tms_incident_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tms_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  severity text,
  status text,
  incident_type text,
  summary text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tracking_updates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  location text,
  latitude text,
  longitude text,
  notes text,
  load_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.trip_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id text,
  from_status text,
  to_status text,
  changed_by text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.vehicle_geofence_status (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  vehicle_id text,
  driver_id text,
  truck_id text,
  geofence_id text,
  entered_at timestamptz,
  last_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workflow_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.schema_migrations (version, name) values (227, 'schema_reconciliation') on conflict (version) do nothing;
