-- 142_admin_settings.sql
-- RONYX ADMIN CONTROL CENTER — backing tables.
-- Creates: ronyx_admin_settings, ronyx_roles, ronyx_staff_users,
--          ronyx_document_routing_rules, ronyx_notification_rules,
--          ronyx_admin_audit_logs

-- ── 1. Admin Settings (key-value config store) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_admin_settings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  setting_group    text        NOT NULL,
  setting_key      text        NOT NULL,
  setting_value    jsonb       DEFAULT '{}'::jsonb,
  updated_by       uuid,
  updated_at       timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, setting_group, setting_key)
);
CREATE INDEX IF NOT EXISTS idx_ras_group ON public.ronyx_admin_settings(setting_group);

-- Seed: Company Profile placeholder
INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'company_profile','profile','{"company_name":"","dba":"","address":"","phone":"","email":"","dot_number":"","mc_number":"","ein":"","primary_contact":"","timezone":"America/Chicago","default_currency":"USD","default_dispatch_region":"","company_type":"Dump Truck Company"}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;

-- Seed: Compliance Defaults
INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'compliance_defaults','expiry_warnings','{"cdl_warning_days":30,"medical_card_warning_days":30,"mvr_refresh_months":12,"insurance_warning_days":30,"registration_warning_days":30,"inspection_warning_days":30,"coi_warning_days":30,"override_expiring_warning_days":7,"auto_create_task_on_expiry":true,"auto_block_dispatch_on_critical_expiry":true,"auto_notify_assigned_staff":true}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;

-- Seed: Payroll Rules
INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'payroll_rules','defaults','{"payroll_week_start":"Monday","payroll_week_end":"Sunday","settlement_review_required":true,"ticket_proof_required":true,"allow_payroll_override":false,"loan_deduction_approval_required":true,"advance_tracking_enabled":true,"export_format":"CSV","require_signed_loan_before_deduction":true,"allow_manager_override_with_reason":true,"auto_create_deduction_from_agreement":true,"stop_deduction_at_zero":true,"create_paid_off_review_task":true}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;

-- Seed: System Rules
INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'system_rules','dispatch','{"block_if_cdl_expired":true,"block_if_medical_expired":true,"block_if_mvr_missing":true,"block_if_inspection_expired":true,"block_if_company_missing":true,"allow_cargo_manager_override":true,"allow_workers_comp_manager_override":true,"block_if_truck_insurance_expired":true}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;

INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'system_rules','payroll','{"hold_if_ticket_proof_missing":true,"hold_if_pod_missing":true,"require_receipt_before_parts_completion":true}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;

-- Seed: AI Settings
INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'ai_settings','guidance','{"show_next_best_action":true,"show_staff_guidance":true,"auto_create_staff_tasks":true,"auto_suggest_document_routing":true,"auto_suggest_dispatch_blockers":true,"auto_suggest_override_option":true,"auto_suggest_backup_truck":true,"auto_suggest_payroll_hold_reason":true}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;

-- Seed: Security Settings
INSERT INTO public.ronyx_admin_settings (organization_id, setting_group, setting_key, setting_value)
VALUES (null,'security','page_protection','{"disable_right_click":false,"disable_copy":false,"disable_print":false,"watermark_pages":false,"log_copy_attempts":true,"allow_copy_in_notes":true,"export_roles":["Owner / Admin","Payroll Admin","Billing Admin","Fleet Manager"]}'::jsonb)
ON CONFLICT (organization_id, setting_group, setting_key) DO NOTHING;


-- ── 2. Roles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_roles (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  role_name        text    NOT NULL,
  role_description text,
  permissions      jsonb   DEFAULT '{}'::jsonb,
  is_system_role   boolean DEFAULT false,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (organization_id, role_name)
);

-- Seed default roles
INSERT INTO public.ronyx_roles (organization_id, role_name, role_description, permissions, is_system_role)
SELECT null, r.role_name, r.role_description, r.permissions::jsonb, true
FROM (VALUES
  ('Owner / Admin','Full system access — can approve overrides, manage roles, and approve payroll/settlements.',
   '{"view_drivers":true,"edit_drivers":true,"upload_documents":true,"approve_compliance":true,"request_override":true,"approve_override":true,"dispatch_jobs":true,"assign_trucks":true,"assign_backup_trucks":true,"create_maintenance_tickets":true,"dispatch_parts_runner":true,"upload_receipts":true,"approve_costs":true,"view_payroll":true,"approve_payroll":true,"view_settlements":true,"approve_settlements":true,"edit_customer_requirements":true,"edit_document_routing":true,"delete_records":true,"export_reports":true,"access_admin_settings":true}'),
  ('Fleet Manager','Manages trucks, maintenance, and fleet readiness.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":true,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":true,"assign_backup_trucks":true,"create_maintenance_tickets":true,"dispatch_parts_runner":true,"upload_receipts":false,"approve_costs":true,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":true,"access_admin_settings":false}'),
  ('Dispatcher','Assigns jobs, views Dispatch Guard, assigns backup trucks.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":false,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":true,"assign_trucks":true,"assign_backup_trucks":true,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":false,"access_admin_settings":false}'),
  ('Compliance Admin','Uploads and reviews driver/OO compliance documents. Can request but not approve overrides.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":true,"approve_compliance":true,"request_override":true,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":true,"access_admin_settings":false}'),
  ('Driver Coordinator','Assigns drivers to trucks/companies. Manages driver onboarding.',
   '{"view_drivers":true,"edit_drivers":true,"upload_documents":true,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":true,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":false,"access_admin_settings":false}'),
  ('Payroll Admin','Reviews and approves settlements and payroll. Manages loan deductions.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":false,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":true,"approve_payroll":true,"view_settlements":true,"approve_settlements":true,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":true,"access_admin_settings":false}'),
  ('Billing Admin','Reviews billing, PODs, and invoices.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":false,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":false,"approve_payroll":false,"view_settlements":true,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":true,"access_admin_settings":false}'),
  ('Fast Scan Staff','Scans and processes tickets. Cannot edit payroll or delete files.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":true,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":false,"access_admin_settings":false}'),
  ('Maintenance Manager','Manages repair orders and maintenance scheduling.',
   '{"view_drivers":false,"edit_drivers":false,"upload_documents":true,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":true,"dispatch_parts_runner":true,"upload_receipts":true,"approve_costs":true,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":false,"access_admin_settings":false}'),
  ('Parts Runner','Can view assigned parts runs, update status, upload receipts only.',
   '{"view_drivers":false,"edit_drivers":false,"upload_documents":false,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":true,"approve_costs":false,"view_payroll":false,"approve_payroll":false,"view_settlements":false,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":false,"access_admin_settings":false}'),
  ('Read Only','Can view all areas but cannot edit, approve, or delete.',
   '{"view_drivers":true,"edit_drivers":false,"upload_documents":false,"approve_compliance":false,"request_override":false,"approve_override":false,"dispatch_jobs":false,"assign_trucks":false,"assign_backup_trucks":false,"create_maintenance_tickets":false,"dispatch_parts_runner":false,"upload_receipts":false,"approve_costs":false,"view_payroll":true,"approve_payroll":false,"view_settlements":true,"approve_settlements":false,"edit_customer_requirements":false,"edit_document_routing":false,"delete_records":false,"export_reports":false,"access_admin_settings":false}')
) AS r(role_name, role_description, permissions)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ronyx_roles rr
  WHERE rr.role_name = r.role_name AND rr.organization_id IS NULL
);


-- ── 3. Staff Users ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_staff_users (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  user_id          uuid,
  full_name        text    NOT NULL,
  email            text,
  phone            text,
  role_id          uuid    REFERENCES public.ronyx_roles(id) ON DELETE SET NULL,
  role_name        text,
  department       text,
  status           text    DEFAULT 'active',
  on_shift         boolean DEFAULT false,
  last_login_at    timestamptz,
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rsu_status ON public.ronyx_staff_users(status);
CREATE INDEX IF NOT EXISTS idx_rsu_role   ON public.ronyx_staff_users(role_id);


-- ── 4. Document Routing Rules ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_document_routing_rules (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid,
  document_type           text    NOT NULL,
  document_label          text    NOT NULL,
  applies_to              text    NOT NULL,
  default_route           text    NOT NULL,
  requires_expiration_date boolean DEFAULT false,
  blocks_dispatch         boolean DEFAULT false,
  blocks_payroll          boolean DEFAULT false,
  assigned_role           text,
  assigned_staff_id       uuid,
  assigned_staff_name     text,
  is_active               boolean DEFAULT true,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE (organization_id, document_type, applies_to)
);

-- Seed default document routing
INSERT INTO public.ronyx_document_routing_rules
  (organization_id, document_type, document_label, applies_to, default_route, requires_expiration_date, blocks_dispatch, blocks_payroll, assigned_role)
SELECT null, d.document_type, d.document_label, d.applies_to, d.default_route,
       d.requires_expiration_date, d.blocks_dispatch, d.blocks_payroll, d.assigned_role
FROM (VALUES
  ('cdl',                  'CDL / Driver License',       'driver',         'Driver Documents',              true,  true,  false, 'Compliance Admin'),
  ('mvr',                  'MVR',                        'driver',         'Driver Documents',              true,  true,  false, 'Compliance Admin'),
  ('medical_card',         'Medical Card',               'driver',         'Driver Documents',              true,  true,  false, 'Compliance Admin'),
  ('drug_test',            'Drug Test',                  'driver',         'Driver Documents',              true,  false, false, 'Compliance Admin'),
  ('background_check',     'Background Check',           'driver',         'Driver Documents',              false, false, false, 'Compliance Admin'),
  ('auto_liability_coi',   'Auto Liability COI',         'owner_operator', 'Owner Operator COI Matrix',     true,  true,  false, 'Compliance Admin'),
  ('general_liability_coi','General Liability COI',      'owner_operator', 'Owner Operator COI Matrix',     true,  true,  false, 'Compliance Admin'),
  ('cargo_coi',            'Cargo COI',                  'owner_operator', 'Owner Operator COI Matrix',     true,  true,  false, 'Compliance Admin'),
  ('workers_comp',         'Workers Compensation',       'owner_operator', 'Owner Operator COI Matrix',     true,  false, false, 'Compliance Admin'),
  ('truck_registration',   'Truck Registration',         'truck',          'Fleet Documents',               true,  true,  false, 'Fleet Admin'),
  ('dot_inspection',       'DOT Inspection',             'truck',          'Fleet Documents',               true,  true,  false, 'Fleet Manager'),
  ('truck_insurance',      'Truck Insurance',            'truck',          'Fleet Documents',               true,  true,  false, 'Fleet Admin'),
  ('repair_invoice',       'Repair Invoice',             'truck',          'Maintenance Work Order',        false, false, false, 'Maintenance Manager'),
  ('parts_receipt',        'Parts Receipt',              'truck',          'Parts Dispatch',                false, false, false, 'Parts Runner'),
  ('driver_loan_agreement','Driver Loan Agreement',      'driver',         'Driver Agreements',             false, false, false, 'Payroll Admin'),
  ('oo_loan_agreement',    'OO Loan Agreement',          'owner_operator', 'Owner Operator Agreements',     false, false, false, 'Payroll Admin'),
  ('ticket_proof',         'Ticket Proof',               'job',            'Fast Scan',                     false, false, true,  'Fast Scan Staff'),
  ('pod',                  'Proof of Delivery (POD)',    'job',            'Fast Scan / Billing',           false, false, true,  'Billing Admin')
) AS d(document_type, document_label, applies_to, default_route, requires_expiration_date, blocks_dispatch, blocks_payroll, assigned_role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ronyx_document_routing_rules r
  WHERE r.document_type = d.document_type AND r.applies_to = d.applies_to AND r.organization_id IS NULL
);


-- ── 5. Notification Rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_notification_rules (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid,
  event_type              text    NOT NULL,
  event_label             text    NOT NULL,
  in_app_enabled          boolean DEFAULT true,
  email_enabled           boolean DEFAULT false,
  sms_enabled             boolean DEFAULT false,
  staff_dashboard_enabled boolean DEFAULT true,
  assigned_role           text,
  assigned_staff_id       uuid,
  days_before             integer,
  is_active               boolean DEFAULT true,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE (organization_id, event_type)
);

INSERT INTO public.ronyx_notification_rules
  (organization_id, event_type, event_label, in_app_enabled, email_enabled, staff_dashboard_enabled, assigned_role, days_before)
SELECT null, n.event_type, n.event_label, n.in_app_enabled, n.email_enabled, n.staff_dashboard_enabled, n.assigned_role, n.days_before
FROM (VALUES
  ('document_expiring_soon',      'Document Expiring Soon',           true, false, true, 'Compliance Admin', 30),
  ('document_expired',            'Document Expired',                 true, false, true, 'Compliance Admin', null),
  ('override_expiring_soon',      'Override Expiring Soon',           true, false, true, 'Compliance Admin', 7),
  ('dispatch_blocked',            'Dispatch Blocked',                 true, false, true, 'Dispatcher',       null),
  ('payroll_hold',                'Payroll Hold',                     true, false, true, 'Payroll Admin',    null),
  ('billing_review',              'Billing Review Required',          true, false, true, 'Billing Admin',    null),
  ('ticket_proof_missing',        'Ticket Proof Missing',             true, false, true, 'Fast Scan Staff',  null),
  ('parts_receipt_missing',       'Parts Receipt Missing',            true, false, true, 'Parts Runner',     null),
  ('truck_out_of_service',        'Truck Out of Service',             true, false, true, 'Fleet Manager',    null),
  ('customer_requirement_missing','Customer Requirement Missing',     true, false, true, 'Compliance Admin', null),
  ('loan_agreement_missing',      'Loan Agreement Missing',           true, false, true, 'Payroll Admin',    null)
) AS n(event_type, event_label, in_app_enabled, email_enabled, staff_dashboard_enabled, assigned_role, days_before)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ronyx_notification_rules r
  WHERE r.event_type = n.event_type AND r.organization_id IS NULL
);


-- ── 6. Admin Audit Log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ronyx_admin_audit_logs (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  action           text    NOT NULL,
  setting_group    text,
  setting_key      text,
  old_value        jsonb,
  new_value        jsonb,
  created_by       uuid,
  created_by_name  text,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_raal_action ON public.ronyx_admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_raal_time   ON public.ronyx_admin_audit_logs(created_at DESC);
