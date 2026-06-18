import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DRIVER_SELECT = `
  id, full_name, phone, email, driver_type, status,
  license_number, license_state, license_expiration_date,
  mvr_expiration, medical_card_expiration, medical_card_number,
  assigned_truck_number, job_assignment, company_name,
  hire_date, pay_rate, pay_type, background_check_status,
  drug_test_expiration, dispatch_eligible, payroll_eligible,
  compliance_flags, notes, organization_id,
  updated_by, updated_at, created_at
`;

export async function GET() {
  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

  // Try org-scoped query first (requires migration 165 to have run)
  let { data, error } = await supabase
    .from("drivers")
    .select(DRIVER_SELECT)
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .or("status.is.null,and(status.neq.archived,status.neq.deleted)")
    .order("full_name", { ascending: true })
    .limit(5000);

  // If organization_id column doesn't exist yet (migration 165 not run),
  // fall back to a simple query so the driver list still works
  if (error && (error.message.includes("organization_id") || error.code === "42703")) {
    const fallback = await supabase
      .from("drivers")
      .select(DRIVER_SELECT)
      .or("status.is.null,and(status.neq.archived,status.neq.deleted)")
      .order("full_name", { ascending: true })
      .limit(5000);
    data  = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ drivers: [], error: error.message }, { status: 200 });
  }

  const drivers = (data || []).map((d: any) => ({
    id:                      d.id,
    full_name:               d.full_name               || "",
    name:                    d.full_name               || "",
    phone:                   d.phone                   || "",
    email:                   d.email                   || "",
    driver_type:             d.driver_type             || "W2",
    status:                  d.status                  || "active",
    license_number:          d.license_number          || "",
    license_state:           d.license_state           || "",
    license_expiration_date: d.license_expiration_date || "",
    mvr_expiration:          d.mvr_expiration          || "",
    medical_card_expiration: d.medical_card_expiration || "",
    medical_card_number:     d.medical_card_number     || "",
    assigned_truck_number:   d.assigned_truck_number   || "",
    job_assignment:          d.job_assignment          || "",
    company_name:            d.company_name            || "",
    hire_date:               d.hire_date               || "",
    pay_rate:                d.pay_rate                ? String(d.pay_rate) : "",
    pay_type:                d.pay_type                || "",
    background_check_status: d.background_check_status || "pending",
    drug_test_expiration:    d.drug_test_expiration    || "",
    dispatch_eligible:       d.dispatch_eligible       ?? false,
    payroll_eligible:        d.payroll_eligible        ?? false,
    compliance_flags:        d.compliance_flags        || [],
    notes:                   d.notes                   || "",
    organization_id:         d.organization_id         || null,
    updated_by:              d.updated_by              || "",
    updated_at:              d.updated_at              || "",
    created_at:              d.created_at              || "",
    // legacy fields for components that expect driver_profiles shape
    rating:                  0,
    last_ticket_date:        "",
    photo_url:               "",
    address:                 "",
    emergency_contact_name:  "",
    emergency_contact_phone: "",
    position_role:           "",
    supervisor_name:         "",
    orientation_completed:   false,
    hazmat_training:         false,
    driver_scorecard:        "",
  }));

  return NextResponse.json({ drivers });
}
