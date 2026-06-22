import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* POST — log a truck reassignment and update driver's current truck */
export async function POST(req: Request) {
  const sb = supabaseAdmin;
  const body = await req.json();

  if (!body.driver_id || !body.new_truck_id) {
    return NextResponse.json({ error: "driver_id and new_truck_id required" }, { status: 400 });
  }

  // Verify the new truck is available (not out of service, not in maintenance)
  if (body.new_truck_id) {
    const { data: truck } = await sb
      .from("ronyx_oo_trucks")
      .select("status, truck_number")
      .eq("id", body.new_truck_id)
      .single();

    if (truck) {
      const blocked = ["out_of_service", "in_maintenance"].includes(truck.status || "");
      if (blocked && !body.manager_override) {
        return NextResponse.json({
          error: `Cannot assign truck ${truck.truck_number}: status is ${truck.status}. Manager override required.`,
          blocked_reason: truck.status,
        }, { status: 409 });
      }
    }
  }

  // Log the reassignment
  const { data: log, error: logErr } = await sb
    .from("ronyx_truck_reassignment_logs")
    .insert({
      oo_id:            body.oo_id || null,
      driver_id:        body.driver_id,
      old_truck_id:     body.old_truck_id || null,
      new_truck_id:     body.new_truck_id,
      driver_name:      body.driver_name || null,
      old_truck_number: body.old_truck_number || null,
      new_truck_number: body.new_truck_number || null,
      reason:           body.reason || null,
      reassigned_by:    body.reassigned_by || null,
      manager_override: body.manager_override ?? false,
      notes:            body.notes || null,
    })
    .select("*")
    .single();

  if (logErr) return NextResponse.json({ error: logErr.message }, { status: 500 });

  // Update driver's current truck assignment
  await sb
    .from("ronyx_oo_drivers")
    .update({ truck_number: body.new_truck_number || null })
    .eq("id", body.driver_id);

  return NextResponse.json({ log, ok: true });
}

/* GET — list recent reassignment logs */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const oo_id = searchParams.get("oo_id");
  const sb = supabaseAdmin;

  let query = sb
    .from("ronyx_truck_reassignment_logs")
    .select("*")
    .order("reassigned_at", { ascending: false })
    .limit(100);

  if (oo_id) query = query.eq("oo_id", oo_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data || [] });
}
