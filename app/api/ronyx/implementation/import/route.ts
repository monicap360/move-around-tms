import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Tables the import endpoint is allowed to write to
const ALLOWED_TABLES: Record<string, { orgColumn: string; conflictOn?: string[] }> = {
  ronyx_customers:       { orgColumn: "organization_id" },
  driver_profiles:       { orgColumn: "organization_id" },
  ronyx_trucks:          { orgColumn: "organization_id" },
  ronyx_owner_operators: { orgColumn: "organization_id" },
  aggregate_tickets:     { orgColumn: "organization_id" },
  projects:              { orgColumn: "organization_id" },
  materials:             { orgColumn: "organization_id" },
  vendor_locations:      { orgColumn: "organization_id" },
};


export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  let body: { phase?: string; table?: string; rows?: Record<string, string>[] };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { phase, table, rows } = body;

  if (!table || !ALLOWED_TABLES[table]) {
    return NextResponse.json({ error: `Table '${table}' is not allowed for import` }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: "Max 2000 rows per import" }, { status: 400 });
  }

  const tableConfig = ALLOWED_TABLES[table];

  // Stamp every row with organization_id + timestamps
  const stamped = rows.map(row => ({
    ...row,
    [tableConfig.orgColumn]: orgId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const errors: string[] = [];
  let inserted = 0;

  // Insert in batches of 100
  for (let i = 0; i < stamped.length; i += 100) {
    const batch = stamped.slice(i, i + 100);
    const { error, count } = await supabase
      .from(table)
      .insert(batch, { count: "exact" });

    if (error) {
      errors.push(`Batch ${Math.floor(i / 100) + 1}: ${error.message}`);
    } else {
      inserted += count ?? batch.length;
    }
  }

  // Update implementation session
  if (phase) {
    const sessionStatus = errors.length === 0 ? "complete" : inserted > 0 ? "complete" : "error";
    await supabase
      .from("ronyx_implementation_sessions")
      .upsert({
        organization_id: orgId,
        phase,
        status:        sessionStatus,
        import_count:  inserted,
        error_count:   errors.length,
        last_error:    errors[0] ?? null,
        completed_at:  sessionStatus === "complete" ? new Date().toISOString() : null,
        updated_at:    new Date().toISOString(),
      }, { onConflict: "organization_id,phase" });
  }

  return NextResponse.json({
    inserted,
    errors,
    total: rows.length,
    success: errors.length === 0,
  });
}
