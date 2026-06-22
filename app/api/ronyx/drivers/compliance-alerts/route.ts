import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Returns all drivers with expired or expiring docs — computed live from driver_profiles.
// No notification table needed; this is the source of truth for the alert strip.
export async function GET() {
  const supabase = supabaseAdmin;
  const today = new Date().toISOString().slice(0, 10);
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, status, driver_profiles(full_name, medical_card_expiration, license_expiration_date, mvr_expiration, email, phone, dispatch_eligible)")
    .neq("status", "inactive")
    .neq("status", "terminated");

  if (error) return NextResponse.json({ alerts: [], error: error.message });

  const alerts: any[] = [];

  for (const d of data || []) {
    const profile = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    if (!profile) continue;
    const name = profile.full_name || d.name || "Unknown Driver";

    const docs = [
      { type: "Medical Card", field: "medical_card_expiration", date: profile.medical_card_expiration },
      { type: "CDL",          field: "license_expiration_date", date: profile.license_expiration_date },
      { type: "MVR",          field: "mvr_expiration",          date: profile.mvr_expiration },
    ];

    for (const doc of docs) {
      if (!doc.date) continue;
      const expired  = doc.date < today;
      const expiring = !expired && doc.date <= in30;
      if (!expired && !expiring) continue;

      const daysLeft = Math.ceil((new Date(doc.date).getTime() - Date.now()) / 86400000);

      alerts.push({
        driver_id:      d.id,
        driver_name:    name,
        driver_email:   profile.email || null,
        driver_phone:   profile.phone || null,
        dispatch_eligible: profile.dispatch_eligible ?? true,
        document_type:  doc.type,
        expires_on:     doc.date,
        days_left:      daysLeft,
        severity:       expired ? "expired" : daysLeft <= 7 ? "critical" : daysLeft <= 14 ? "high" : "warning",
      });
    }
  }

  // Sort: expired first, then soonest expiry
  alerts.sort((a, b) => a.days_left - b.days_left);

  return NextResponse.json({ alerts, total: alerts.length, expired: alerts.filter(a => a.severity === "expired").length });
}
