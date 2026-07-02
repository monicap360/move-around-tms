import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ — "Find Drivers": the screened driver pool (driver_profiles) across
// the platform, so the product company can match available drivers to hiring fleets.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("driver_profiles")
    .select("id, full_name, phone, email, license_class, license_state, license_expiration_date, medical_card_expiration, position_role, status, hire_date, dispatch_eligible, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ drivers: [], error: error.message });
  const today = new Date().toISOString().slice(0, 10);
  const drivers = (data || []).map(d => ({
    ...d,
    cdl_valid: d.license_expiration_date ? d.license_expiration_date >= today : null,
    med_valid: d.medical_card_expiration ? d.medical_card_expiration >= today : null,
  }));
  return NextResponse.json({ count: drivers.length, drivers });
}
