import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Fields that are ALWAYS safe to return — no identity information
const PUBLIC_FIELDS = [
  "id",
  "anonymous_driver_id",
  "city_area",
  "preferred_work_area",
  "years_experience",
  "driver_type",
  "license_class",
  "endorsements",
  "equipment_experience",
  "material_experience",
  "availability_status",
  "hire_ready_score",
  "compliance_summary",
  "redacted_experience_summary",
  "network_status",
  "network_listed_at",
  // Doc status fields (no actual documents, just statuses)
  "license_expiration_date",
  "medical_card_expiration",
  "mvr_expiration",
  "drug_test_expiration",
  "background_check_status",
] as const;

// Fields released ONLY after an approved unlock
const LOCKED_FIELDS = [
  "full_name",
  "first_name",
  "last_name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "zip",
  "license_number",
  "emergency_contact",
  "references",
  "previous_employers",
] as const;

function buildComplianceSummary(row: Record<string, unknown>): string {
  const items: string[] = [];
  const now = new Date();

  if (row.license_number) items.push("CDL uploaded");
  else items.push("CDL not uploaded");

  const medExp = row.medical_card_expiration ? new Date(row.medical_card_expiration as string) : null;
  if (medExp && medExp > now) items.push("Medical card current");
  else if (medExp) items.push("Medical card expired");
  else items.push("Medical card pending");

  const mvrExp = row.mvr_expiration ? new Date(row.mvr_expiration as string) : null;
  if (mvrExp && mvrExp > now) items.push("MVR current");
  else items.push("MVR pending review");

  const drugExp = row.drug_test_expiration ? new Date(row.drug_test_expiration as string) : null;
  if (drugExp && drugExp > now) items.push("Drug test passed");
  else items.push("Drug test pending");

  if (row.background_check_status === "passed") items.push("Background check passed");
  else items.push("Background check pending");

  return items.join(" · ");
}

function buildHireReadyScore(row: Record<string, unknown>): number {
  const now = new Date();
  let score = 0;
  const checks = [
    !!row.license_number,
    !!row.medical_card_expiration && new Date(row.medical_card_expiration as string) > now,
    !!row.mvr_expiration && new Date(row.mvr_expiration as string) > now,
    !!row.drug_test_expiration && new Date(row.drug_test_expiration as string) > now,
    row.background_check_status === "passed",
    !!row.pay_rate,
    (row.equipment_experience as string[] | null)?.length ?? 0 > 0,
    (row.material_experience as string[] | null)?.length ?? 0 > 0,
    !!row.city_area || !!row.city,
    !!row.years_experience,
  ];
  checks.forEach(c => { if (c) score += 10; });
  return score;
}

// Masks a field — redacts all content but confirms it exists
function maskIfLocked(value: unknown, locked: boolean): string | null {
  if (!locked) return value as string;
  if (value) return "••••••";
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driver_type     = searchParams.get("driver_type");
  const availability    = searchParams.get("availability");
  const min_score       = parseInt(searchParams.get("min_score") || "0", 10);
  const equipment       = searchParams.get("equipment");
  const limit           = parseInt(searchParams.get("limit") || "50", 10);
  const org_id          = searchParams.get("org_id");

  const supabase = supabaseAdmin;

  // Fetch network-visible drivers
  let query = supabase
    .from("driver_profiles")
    .select(`
      id, anonymous_driver_id, city_area, preferred_work_area,
      years_experience, driver_type, license_class, endorsements,
      equipment_experience, material_experience, availability_status,
      hire_ready_score, compliance_summary, redacted_experience_summary,
      network_status, network_listed_at,
      license_number, medical_card_expiration, mvr_expiration,
      drug_test_expiration, background_check_status, pay_rate,
      identity_locked, contact_locked, resume_locked, documents_locked,
      driver_consent_status, city, state
    `)
    .eq("profile_visibility", "network")
    .eq("driver_consent_status", "granted")
    .gte("hire_ready_score", min_score)
    .order("hire_ready_score", { ascending: false })
    .limit(limit);

  if (driver_type)  query = query.ilike("driver_type", `%${driver_type}%`);
  if (availability) query = query.eq("availability_status", availability);

  const { data: drivers, error } = await query;

  if (error) {
    // Column may not exist yet (migration 176 not run)
    return NextResponse.json({
      drivers: [],
      total: 0,
      error: error.message,
      _note: "Run migration 176 to enable MoveAround Driver Network™.",
    });
  }

  // Fetch this org's unlocks and shortlists (to show unlock state per driver)
  const orgUnlocks    = new Set<string>();
  const orgShortlists = new Set<string>();

  if (org_id) {
    const [unlockRes, shortlistRes] = await Promise.all([
      supabase.from("driver_network_unlocks")
        .select("driver_profile_id, status, identity_released, contact_released")
        .eq("organization_id", org_id)
        .eq("status", "approved"),
      supabase.from("driver_network_shortlists")
        .select("driver_profile_id")
        .eq("organization_id", org_id),
    ]);
    (unlockRes.data ?? []).forEach(u => orgUnlocks.add(u.driver_profile_id));
    (shortlistRes.data ?? []).forEach(s => orgShortlists.add(s.driver_profile_id));
  }

  const result = (drivers ?? []).map(d => {
    const row = d as Record<string, unknown>;
    const isUnlocked    = orgUnlocks.has(row.id as string);
    const isShortlisted = orgShortlists.has(row.id as string);

    // Recompute score and summary if not stored
    const score   = Number(row.hire_ready_score) || buildHireReadyScore(row);
    const summary = (row.compliance_summary as string) || buildComplianceSummary(row);

    return {
      // Always-visible anonymous fields
      id:                         row.id,
      anonymous_driver_id:        row.anonymous_driver_id || `MADN-${String(row.id).slice(0, 4).toUpperCase()}`,
      city_area:                  row.city_area || (row.city ? `${row.city} area` : "Location not listed"),
      preferred_work_area:        row.preferred_work_area || null,
      years_experience:           row.years_experience || null,
      driver_type:                row.driver_type || "CDL Driver",
      license_class:              row.license_class || null,
      endorsements:               row.endorsements || null,
      equipment_experience:       row.equipment_experience || [],
      material_experience:        row.material_experience || [],
      availability_status:        row.availability_status || "not_available",
      hire_ready_score:           score,
      compliance_summary:         summary,
      redacted_experience_summary: row.redacted_experience_summary || null,
      network_status:             row.network_status || "anonymous_profile",

      // Unlock / shortlist state for this company
      is_shortlisted: isShortlisted,
      is_unlocked:    isUnlocked,

      // Identity fields — only shown after unlock
      full_name:  isUnlocked ? maskIfLocked(row.full_name, false) : null,
      phone:      isUnlocked ? maskIfLocked(row.phone, false) : null,
      email:      isUnlocked ? maskIfLocked(row.email, false) : null,

      // These are always hidden — never returned to API consumers
      // (license_number, address, CDL/medical images, MVR, references)
      _identity_locked:  !isUnlocked,
      _contact_locked:   !isUnlocked,
      _resume_locked:    !isUnlocked,
      _documents_locked: !isUnlocked,
    };
  });

  return NextResponse.json({
    drivers: result,
    total:   result.length,
    unlock_price: 9900,       // cents — $99.00
    subscription_price: 29900, // cents — $299/mo
    unlocks_per_month: 5,
    extra_unlock_price: 4900,  // cents — $49.00
  });
}
