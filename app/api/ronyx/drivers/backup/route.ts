import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  // Try the view first (requires migration 113); fall back to raw drivers table
  const { data: viewData, error: viewErr } = await supabase
    .from("driver_backup_data_view")
    .select("*")
    .order("driver_name", { ascending: true });

  if (!viewErr) {
    return NextResponse.json({ drivers: viewData || [], source: "view" });
  }

  // View not yet created — query drivers directly with available columns
  const { data: raw, error } = await supabase
    .from("drivers")
    .select("id, full_name, license_number, license_expiration_date, assigned_truck_number, medical_card_expiration, status, dispatch_eligible, payroll_eligible, compliance_flags, updated_at, updated_by, notes, organization_id")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message, drivers: [] }, { status: 500 });

  const drivers = (raw || []).map((d: any) => ({
    id:                      d.id,
    driver_name:             d.full_name,
    cdl_number:              d.license_number,
    cdl_expiration:          d.license_expiration_date,
    truck_number:            d.assigned_truck_number,
    medical_card_number:     null,
    medical_card_expiration: d.medical_card_expiration,
    job_assignment:          null,
    company_name:            null,
    driver_status:           d.status,
    dispatch_eligible:       d.dispatch_eligible,
    payroll_eligible:        d.payroll_eligible,
    compliance_flags:        d.compliance_flags,
    last_updated:            d.updated_at,
    updated_by:              d.updated_by,
    notes:                   d.notes,
    organization_id:         d.organization_id,
  }));

  return NextResponse.json({ drivers, source: "fallback" });
}
