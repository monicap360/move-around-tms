import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/ronyx/payout-import
// Body: {
//   project_name, week_start, week_end,
//   file_name,       — original CSV filename
//   original_upload_id,  — from /api/ronyx/upload-file (optional but preferred)
//   loads: [{company_name, truck_number, load_date, origin, destination, loads_count, rate, total, notes}]
// }
//
// Safety rules:
//   - Never delete or mutate original_uploads
//   - Dedup: skip rows where same oo_id + truck_number + load_date already exists
//   - raw_row JSON stored on every job row
export async function POST(req: Request) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  const { project_name, week_start, week_end, loads, file_name, original_upload_id } = body as {
    project_name:        string;
    week_start:          string;
    week_end:            string;
    loads:               { company_name: string; truck_number: string; load_date: string; origin: string; destination: string; loads_count: number; rate: number; total: number; notes?: string }[];
    file_name?:          string;
    original_upload_id?: string;
  };

  if (!loads?.length) return NextResponse.json({ error: "No loads provided" }, { status: 400 });

  // ── 1. Find / create OO companies ──
  const uniqueCompanies = [...new Set(loads.map((l) => l.company_name).filter(Boolean))];

  const { data: existingOOs } = await sb
    .from("ronyx_owner_operators")
    .select("id, company_name")
    .in("company_name", uniqueCompanies);

  const ooMap: Record<string, string> = {};
  (existingOOs || []).forEach((o: any) => { ooMap[o.company_name.toLowerCase()] = o.id; });

  const missing = uniqueCompanies.filter((n) => !ooMap[n.toLowerCase()]);
  if (missing.length > 0) {
    const { data: created } = await sb
      .from("ronyx_owner_operators")
      .insert(missing.map((n) => ({ company_name: n, status: "active" })))
      .select("id, company_name");
    (created || []).forEach((o: any) => { ooMap[o.company_name.toLowerCase()] = o.id; });
  }

  // ── 2. Create payout batch record ──
  const grandTotal = loads.reduce((s, l) => s + (l.total || 0), 0);
  const { data: batch } = await sb
    .from("payout_import_batches")
    .insert({
      import_name:       `Payout ${project_name || "Import"} – ${week_start || new Date().toLocaleDateString()}`,
      source_file_name:  file_name || null,
      original_upload_id: original_upload_id || null,
      project_name:      project_name || "Domino Project",
      week_start:        week_start   || null,
      week_end:          week_end     || null,
      total_rows:        loads.length,
      oos_created:       missing.length,
      grand_total:       grandTotal,
    })
    .select("id")
    .single();

  const batchId = batch?.id || null;

  // ── 3. Dedup — find rows that already exist ──
  // Check by oo_id + truck_number + load_date to prevent re-importing same CSV
  const loadsWithOO = loads
    .map((l) => ({ ...l, oo_id: ooMap[l.company_name.toLowerCase()] }))
    .filter((l) => l.oo_id);

  const truckDateCombos = loadsWithOO.map((l) => `${l.oo_id}::${l.truck_number}::${l.load_date}`);
  const uniqueCombos    = [...new Set(truckDateCombos)];

  // Fetch existing jobs that match any of these combos
  const { data: existing } = await sb
    .from("ronyx_oo_jobs")
    .select("oo_id, truck_number, load_date")
    .in("oo_id", [...new Set(loadsWithOO.map((l) => l.oo_id))]);

  const existingSet = new Set(
    (existing || []).map((j: any) => `${j.oo_id}::${j.truck_number}::${j.load_date}`)
  );

  const newLoads  = loadsWithOO.filter((l) => !existingSet.has(`${l.oo_id}::${l.truck_number}::${l.load_date}`));
  const skipCount = loadsWithOO.length - newLoads.length;

  // ── 4. Insert new job rows ──
  const jobRows = newLoads.map((l) => ({
    oo_id:             l.oo_id,
    payout_batch_id:   batchId,
    project_name:      project_name || "Domino Project",
    load_date:         l.load_date,
    truck_number:      l.truck_number,
    origin:            l.origin   || null,
    destination:       l.destination || null,
    material:          "limestone",
    tons:              l.loads_count,
    gross_revenue:     l.total,
    oo_rate:           l.total,
    margin:            0,
    ticket_status:     "Verified",
    settlement_status: "Pending",
    notes:             l.notes || null,
  }));

  let inserted: any[] = [];
  if (jobRows.length > 0) {
    const { data, error } = await sb
      .from("ronyx_oo_jobs")
      .insert(jobRows)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted = data || [];
  }

  // Update batch with final count
  if (batchId) {
    await sb.from("payout_import_batches").update({ jobs_created: inserted.length }).eq("id", batchId);
  }

  // Update original_upload with related_import_id
  if (original_upload_id && batchId) {
    await sb.from("original_uploads").update({
      related_import_id: batchId,
      related_table:     "payout_import_batches",
    }).eq("id", original_upload_id);
  }

  return NextResponse.json({
    ok:           true,
    batch_id:     batchId,
    jobs_created: inserted.length,
    jobs_skipped: skipCount,
    oos_created:  missing.length,
    oos_matched:  uniqueCompanies.length - missing.length,
  });
}

// GET /api/ronyx/payout-import — list payout batches
export async function GET() {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("payout_import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ batches: data || [] });
}
