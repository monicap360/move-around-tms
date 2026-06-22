import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST — runs the compliance check, blocks expired drivers, returns summary.
// Call this from a cron job, a manual "Run Audit" button, or on page load.
export async function POST() {
  const supabase = supabaseAdmin;
  const today    = new Date().toISOString().slice(0, 10);

  const { data: drivers, error } = await supabase
    .from("drivers")
    .select("id, name, driver_profiles(full_name, medical_card_expiration, license_expiration_date, mvr_expiration, dispatch_eligible)")
    .neq("status", "inactive");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const blocked: any[]  = [];
  const warnings: any[] = [];

  for (const d of drivers || []) {
    const profile = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    if (!profile) continue;
    const name = profile.full_name || d.name;

    const expired = [
      profile.medical_card_expiration && profile.medical_card_expiration < today ? "Medical Card" : null,
      profile.license_expiration_date && profile.license_expiration_date < today ? "CDL"          : null,
      profile.mvr_expiration          && profile.mvr_expiration          < today ? "MVR"          : null,
    ].filter(Boolean) as string[];

    if (expired.length > 0) {
      // Block dispatch eligibility
      await supabase
        .from("driver_profiles")
        .update({ dispatch_eligible: false })
        .eq("driver_id", d.id);

      blocked.push({ driver_id: d.id, name, expired_docs: expired });
    }

    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const expiring = [
      profile.medical_card_expiration && profile.medical_card_expiration > today && profile.medical_card_expiration <= in30 ? `Medical Card (${profile.medical_card_expiration})` : null,
      profile.license_expiration_date && profile.license_expiration_date > today && profile.license_expiration_date <= in30 ? `CDL (${profile.license_expiration_date})`          : null,
      profile.mvr_expiration          && profile.mvr_expiration          > today && profile.mvr_expiration          <= in30 ? `MVR (${profile.mvr_expiration})`                   : null,
    ].filter(Boolean) as string[];

    if (expiring.length > 0) warnings.push({ driver_id: d.id, name, expiring_docs: expiring });
  }

  return NextResponse.json({
    checked:  (drivers || []).length,
    blocked:  blocked.length,
    warnings: warnings.length,
    blocked_drivers:  blocked,
    warning_drivers:  warnings,
    run_at:   new Date().toISOString(),
  });
}
