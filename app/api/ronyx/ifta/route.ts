import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FILING_TASKS = [
  { task_key: "import_mileage",          title: "Import GPS / Dispatch Mileage",       impact_level: "critical" },
  { task_key: "assign_jurisdiction",     title: "Assign Jurisdiction to All Miles",    impact_level: "critical" },
  { task_key: "import_fuel_card",        title: "Import Fuel Card Data",               impact_level: "critical" },
  { task_key: "upload_receipts",         title: "Upload Fuel Receipts",                impact_level: "high"     },
  { task_key: "match_fuel_to_truck",     title: "Match Fuel Purchases to Truck",       impact_level: "critical" },
  { task_key: "match_fuel_to_state",     title: "Match Fuel Purchases to Jurisdiction",impact_level: "critical" },
  { task_key: "review_duplicates",       title: "Review Duplicate Fuel Records",       impact_level: "high"     },
  { task_key: "resolve_missing_receipts",title: "Resolve Missing Receipt Records",     impact_level: "high"     },
  { task_key: "compare_gps_dispatch",    title: "Compare GPS Miles vs Dispatch Miles", impact_level: "medium"   },
  { task_key: "review_mpg_outliers",     title: "Review Truck MPG Outliers",           impact_level: "medium"   },
  { task_key: "load_tax_rates",          title: "Confirm IFTA Tax Rates Loaded",       impact_level: "high"     },
  { task_key: "review_calculation",      title: "Review IFTA Return Calculation",      impact_level: "critical" },
  { task_key: "manager_approval",        title: "Manager Approval",                    impact_level: "critical" },
  { task_key: "export_filing_packet",    title: "Export Filing Packet",                impact_level: "critical" },
];

async function resolveSession(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  const { data: seat } = await supabaseAdmin
    .from("user_seats")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!seat) return null;
  return { user, orgId: seat.organization_id as string, role: seat.role as string };
}

function quarterDates(year: number, quarter: number) {
  const starts = [[1,1],[4,1],[7,1],[10,1]];
  const ends   = [[3,31],[6,30],[9,30],[12,31]];
  const [sm,sd] = starts[quarter-1];
  const [em,ed] = ends[quarter-1];
  return {
    start_date: `${year}-${String(sm).padStart(2,"0")}-${String(sd).padStart(2,"0")}`,
    end_date:   `${year}-${String(em).padStart(2,"0")}-${String(ed).padStart(2,"0")}`,
  };
}

/** GET /api/ronyx/ifta?year=2026&quarter=2 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { orgId } = session;
  const year    = Number(req.nextUrl.searchParams.get("year"))    || new Date().getFullYear();
  const quarter = Number(req.nextUrl.searchParams.get("quarter")) || Math.ceil((new Date().getMonth() + 1) / 3);

  // Ensure period record exists
  const dates = quarterDates(year, quarter);
  const { data: period } = await supabaseAdmin
    .from("ifta_reporting_periods")
    .upsert({
      organization_id: orgId,
      year,
      quarter,
      ...dates,
    }, { onConflict: "organization_id,year,quarter", ignoreDuplicates: true })
    .select("*")
    .maybeSingle();

  const { data: existingPeriod } = await supabaseAdmin
    .from("ifta_reporting_periods")
    .select("*")
    .eq("organization_id", orgId)
    .eq("year", year)
    .eq("quarter", quarter)
    .maybeSingle();

  const periodId = existingPeriod?.id;

  // Seed filing tasks if not present
  if (periodId) {
    const { data: existingTasks } = await supabaseAdmin
      .from("ifta_filing_tasks")
      .select("task_key")
      .eq("reporting_period_id", periodId)
      .eq("organization_id", orgId);

    const existingKeys = new Set((existingTasks || []).map((t: any) => t.task_key));
    const missingTasks = FILING_TASKS.filter(t => !existingKeys.has(t.task_key));

    if (missingTasks.length > 0) {
      void supabaseAdmin.from("ifta_filing_tasks").insert(
        missingTasks.map(t => ({
          organization_id:     orgId,
          reporting_period_id: periodId,
          ...t,
        }))
      );
    }
  }

  // Fetch all data in parallel
  const [jmRes, ftRes, tasksRes, taxRes] = await Promise.all([
    supabaseAdmin
      .from("ifta_jurisdiction_miles")
      .select("*")
      .eq("organization_id", orgId)
      .eq("reporting_period_id", periodId ?? "")
      .order("date", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("ifta_fuel_transactions")
      .select("*")
      .eq("organization_id", orgId)
      .eq("reporting_period_id", periodId ?? "")
      .order("transaction_date", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("ifta_filing_tasks")
      .select("*")
      .eq("organization_id", orgId)
      .eq("reporting_period_id", periodId ?? "")
      .order("created_at"),
    supabaseAdmin
      .from("ifta_tax_rates")
      .select("*")
      .eq("year", year)
      .eq("quarter", quarter),
  ]);

  const miles = jmRes.data || [];
  const fuel  = ftRes.data || [];
  const tasks = tasksRes.data || [];
  const taxRates = taxRes.data || [];

  // Compute KPIs
  const totalMiles = miles.reduce((s: number, r: any) => s + Number(r.actual_miles || 0), 0);
  const verifiedMiles = miles.filter((r: any) => r.verification_status === "verified")
    .reduce((s: number, r: any) => s + Number(r.actual_miles || 0), 0);
  const missingMiles = miles.filter((r: any) => r.verification_status === "missing_jurisdiction")
    .reduce((s: number, r: any) => s + Number(r.actual_miles || 0), 0);

  const totalGallons = fuel.reduce((s: number, r: any) => s + Number(r.gallons || 0), 0);
  const missingFuel = fuel.filter((r: any) => ["needs_truck_assignment","needs_state_assignment","missing_receipt"].includes(r.match_status)).length;
  const totalFuelCost = fuel.reduce((s: number, r: any) => s + Number(r.total_cost || 0), 0);

  const avgMpg = totalGallons > 0 ? totalMiles / totalGallons : 0;
  const fuelCostPerMile = totalMiles > 0 ? totalFuelCost / totalMiles : 0;

  // Task readiness %
  const readyCount = tasks.filter((t: any) => ["ready","approved"].includes(t.status)).length;
  const readinessPct = tasks.length > 0 ? Math.round((readyCount / tasks.length) * 100) : 0;

  // Estimated net tax
  const byJurisdiction: Record<string, { miles: number; taxPaidGallons: number }> = {};
  for (const m of miles) {
    if (!byJurisdiction[m.jurisdiction_code]) byJurisdiction[m.jurisdiction_code] = { miles: 0, taxPaidGallons: 0 };
    byJurisdiction[m.jurisdiction_code].miles += Number(m.actual_miles || 0);
  }
  for (const f of fuel.filter((r: any) => r.is_ifta_eligible && r.jurisdiction_code)) {
    if (!byJurisdiction[f.jurisdiction_code]) byJurisdiction[f.jurisdiction_code] = { miles: 0, taxPaidGallons: 0 };
    byJurisdiction[f.jurisdiction_code].taxPaidGallons += Number(f.gallons || 0);
  }

  let estimatedTax = 0;
  const jurisdictionSummary = Object.entries(byJurisdiction).map(([code, data]) => {
    const taxRate = taxRates.find((r: any) => r.jurisdiction_code === code)?.tax_rate || 0;
    const taxableGallons = totalGallons > 0 ? (data.miles / (totalMiles || 1)) * totalGallons : 0;
    const taxDue = (taxableGallons - data.taxPaidGallons) * Number(taxRate);
    estimatedTax += taxDue;
    return {
      jurisdiction_code: code,
      miles:             data.miles,
      taxable_gallons:   taxableGallons,
      tax_paid_gallons:  data.taxPaidGallons,
      tax_rate:          taxRate,
      estimated_tax_due: taxDue,
      mpg:               data.miles > 0 && data.taxPaidGallons > 0 ? data.miles / data.taxPaidGallons : null,
    };
  }).sort((a, b) => b.miles - a.miles);

  // Money-at-risk alerts
  const alerts: Array<{ type: string; severity: string; title: string; message: string; count?: number; estimated_impact?: number }> = [];

  if (missingFuel > 0)
    alerts.push({ type: "missing_fuel", severity: "high", title: `${missingFuel} fuel records need attention`, message: "Unmatched or incomplete fuel transactions will cause incorrect IFTA calculation.", count: missingFuel, estimated_impact: missingFuel * 250 });

  const missingMileRows = miles.filter((r: any) => r.verification_status === "missing_jurisdiction").length;
  if (missingMileRows > 0)
    alerts.push({ type: "missing_jurisdiction", severity: "critical", title: `${missingMileRows} trips missing jurisdiction assignment`, message: "Mileage with no state assigned cannot be included in IFTA filing.", count: missingMileRows, estimated_impact: missingMiles * 0.18 });

  const conflictRows = miles.filter((r: any) => r.verification_status === "mileage_conflict").length;
  if (conflictRows > 0)
    alerts.push({ type: "mileage_conflict", severity: "warning", title: `${conflictRows} trips have GPS vs dispatch mileage conflict`, message: "Dispatch planned miles and GPS recorded miles differ. Review before filing.", count: conflictRows });

  if (estimatedTax > 500)
    alerts.push({ type: "tax_exposure", severity: "warning", title: `$${Math.abs(estimatedTax).toFixed(0)} estimated IFTA ${estimatedTax > 0 ? "due" : "credit"}`, message: "Based on jurisdiction miles and fuel tax rates loaded.", estimated_impact: estimatedTax });

  const blockedTasks = tasks.filter((t: any) => t.status === "blocked").length;
  if (blockedTasks > 0)
    alerts.push({ type: "blocked_task", severity: "critical", title: `${blockedTasks} filing task${blockedTasks > 1 ? "s" : ""} blocked`, message: "Filing is blocked until these tasks are resolved." });

  // Update readiness on period
  if (periodId) {
    void supabaseAdmin.from("ifta_reporting_periods")
      .update({ readiness_percent: readinessPct })
      .eq("id", periodId);
  }

  return NextResponse.json({
    period:               existingPeriod,
    filing_tasks:         tasks,
    jurisdiction_miles:   miles,
    fuel_transactions:    fuel,
    jurisdiction_summary: jurisdictionSummary,
    kpis: {
      readiness_pct:         readinessPct,
      total_jurisdiction_miles: Math.round(totalMiles),
      total_gallons_recorded:  Number(totalGallons.toFixed(3)),
      missing_mileage_miles:   Math.round(missingMiles),
      missing_fuel_count:      missingFuel,
      estimated_net_ifta_tax:  Number(estimatedTax.toFixed(2)),
      average_fleet_mpg:       Number(avgMpg.toFixed(2)),
      fuel_cost_per_mile:      Number(fuelCostPerMile.toFixed(4)),
    },
    alerts,
    tax_rates:            taxRates,
  });
}

/** POST /api/ronyx/ifta — update task status, lock/unlock period */
export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { orgId, user } = session;
  const body   = await req.json();
  const action = body.action as string;

  /* ── Update filing task status ── */
  if (action === "update_task") {
    const { task_id, status, owner_name, notes, due_date } = body;
    const patch: Record<string, unknown> = {};
    if (status)     patch.status     = status;
    if (owner_name) patch.owner_name = owner_name;
    if (notes)      patch.notes      = notes;
    if (due_date)   patch.due_date   = due_date;
    if (status === "approved" || status === "ready") patch.completed_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("ifta_filing_tasks")
      .update(patch)
      .eq("id", task_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  }

  /* ── Lock period ── */
  if (action === "lock_period") {
    const { period_id } = body;
    const { data, error } = await supabaseAdmin
      .from("ifta_reporting_periods")
      .update({ status: "locked", locked_at: new Date().toISOString(), locked_by: user.email })
      .eq("id", period_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void supabaseAdmin.from("platform_admin_audit_log").insert({
      actor_id: user.id, actor_email: user.email, org_id: orgId,
      event_type: "ifta.period_locked", details: { period_id },
    });
    return NextResponse.json({ period: data });
  }

  /* ── Reopen period ── */
  if (action === "reopen_period") {
    const { period_id, reason } = body;
    const { data, error } = await supabaseAdmin
      .from("ifta_reporting_periods")
      .update({ status: "in_progress", locked_at: null, locked_by: null })
      .eq("id", period_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void supabaseAdmin.from("platform_admin_audit_log").insert({
      actor_id: user.id, actor_email: user.email, org_id: orgId,
      event_type: "ifta.period_reopened", details: { period_id, reason },
    });
    return NextResponse.json({ period: data });
  }

  /* ── Mark filed ── */
  if (action === "mark_filed") {
    const { period_id, confirmation_number } = body;
    const { data, error } = await supabaseAdmin
      .from("ifta_reporting_periods")
      .update({ status: "filed", filed_at: new Date().toISOString(), filed_by: user.email, filing_confirmation_number: confirmation_number })
      .eq("id", period_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ period: data });
  }

  /* ── Verify mileage record ── */
  if (action === "verify_miles") {
    const { mile_id } = body;
    const { data, error } = await supabaseAdmin
      .from("ifta_jurisdiction_miles")
      .update({ verification_status: "verified", reviewed_by: user.email, reviewed_at: new Date().toISOString() })
      .eq("id", mile_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mile: data });
  }

  /* ── Update mileage jurisdiction ── */
  if (action === "assign_jurisdiction") {
    const { mile_id, jurisdiction_code, actual_miles } = body;
    const patch: Record<string, unknown> = { verification_status: "manually_adjusted", reviewed_by: user.email, reviewed_at: new Date().toISOString() };
    if (jurisdiction_code) patch.jurisdiction_code = jurisdiction_code.toUpperCase().slice(0, 2);
    if (actual_miles != null) patch.actual_miles = Number(actual_miles);
    const { data, error } = await supabaseAdmin
      .from("ifta_jurisdiction_miles")
      .update(patch)
      .eq("id", mile_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mile: data });
  }

  /* ── Update fuel transaction ── */
  if (action === "update_fuel") {
    const { fuel_id, truck_id, jurisdiction_code, match_status, is_ifta_eligible } = body;
    const patch: Record<string, unknown> = {};
    if (truck_id != null)         patch.truck_id         = truck_id;
    if (jurisdiction_code != null) patch.jurisdiction_code = jurisdiction_code.toUpperCase().slice(0, 2);
    if (match_status != null)     patch.match_status     = match_status;
    if (is_ifta_eligible != null) patch.is_ifta_eligible = Boolean(is_ifta_eligible);
    const { data, error } = await supabaseAdmin
      .from("ifta_fuel_transactions")
      .update(patch)
      .eq("id", fuel_id)
      .eq("organization_id", orgId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ fuel: data });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
