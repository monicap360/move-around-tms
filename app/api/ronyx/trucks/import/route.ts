import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type TruckRow = {
  truck_number:            string;
  make:                    string;
  model:                   string;
  year:                    string;
  vin:                     string;
  plate:                   string;
  plate_state:             string;
  axle_config:             string;
  axle_count:              string;
  gvwr:                    string;
  tare_weight:             string;
  max_payload_tons:        string;
  max_payload_lbs:         string;
  body_type:               string;
  truck_size:              string;
  dot_class:               string;
  bed_capacity_yards:      string;
  registration_expiration: string;
  insurance_expiration:    string;
  status:                  string;
  notes:                   string;
  assigned_driver:         string;
  fuel_type:               string;
  _action:                 "import" | "update" | "skip";
};

function toDateOrNull(val: string): string | null {
  if (!val?.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toIntOrNull(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toFloatOrNull(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));
  const { rows = [] } = body as { rows: TruckRow[] };

  if (!rows.length) return NextResponse.json({ error: "No rows provided" }, { status: 400 });

  // Get org from session
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  let orgId: string | null = null;
  if (userId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();
    orgId = member?.org_id ?? null;
  }

  let imported = 0;
  let updated  = 0;
  let skipped  = 0;
  let failed   = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Skip rows the user marked as skip
    if (row._action === "skip") { skipped++; continue; }

    if (!row.truck_number?.trim()) {
      errors.push(`Row skipped — missing truck number`);
      failed++;
      continue;
    }

    const payload = {
      truck_number:            row.truck_number.trim(),
      make:                    row.make        || null,
      model:                   row.model       || null,
      year:                    toIntOrNull(row.year),
      vin:                     row.vin         || null,
      plate:                   row.plate       || null,
      plate_state:             row.plate_state || null,
      axle_config:             row.axle_config || null,
      axle_count:              toIntOrNull(row.axle_count),
      gvwr:                    toIntOrNull(row.gvwr),
      tare_weight:             toIntOrNull(row.tare_weight),
      max_payload_tons:        toFloatOrNull(row.max_payload_tons),
      max_payload_lbs:         toIntOrNull(row.max_payload_lbs),
      body_type:               row.body_type   || null,
      truck_size:              row.truck_size  || null,
      dot_class:               row.dot_class   || null,
      bed_capacity_yards:      toFloatOrNull(row.bed_capacity_yards),
      registration_expiration: toDateOrNull(row.registration_expiration),
      insurance_expiration:    toDateOrNull(row.insurance_expiration),
      status:                  row.status      || "active",
      notes:                   row.notes       || null,
      fuel_type:               row.fuel_type   || "diesel",
      organization_id:         orgId,
    };

    try {
      if (row._action === "update") {
        const { data: existing } = await supabase
          .from("ronyx_trucks")
          .select("id")
          .ilike("truck_number", row.truck_number.trim())
          .limit(1)
          .single();

        if (existing?.id) {
          const { error } = await supabase
            .from("ronyx_trucks")
            .update(payload)
            .eq("id", existing.id);
          if (error) { errors.push(`Update failed for ${row.truck_number}: ${error.message}`); failed++; }
          else updated++;
          continue;
        }
      }

      // Insert new
      const { error } = await supabase.from("ronyx_trucks").insert(payload);
      if (error) { errors.push(`Insert failed for ${row.truck_number}: ${error.message}`); failed++; }
      else imported++;

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row error for ${row.truck_number || "unknown"}: ${msg}`);
      failed++;
    }
  }

  return NextResponse.json({ imported, updated, skipped, failed, errors });
}
