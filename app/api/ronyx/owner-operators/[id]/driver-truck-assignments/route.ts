import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* GET — list all driver-truck assignments for an OO */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("ronyx_driver_truck_assignments")
    .select(`
      *,
      driver:ronyx_oo_drivers(id, name, phone),
      truck:ronyx_oo_trucks(id, truck_number, year, make, model, status, type, last_inspection, inspection_result)
    `)
    .eq("oo_id", params.id)
    .eq("is_active", true)
    .order("priority");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}

/* POST — assign a truck to a driver */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  if (!body.driver_id || !body.truck_id) {
    return NextResponse.json({ error: "driver_id and truck_id required" }, { status: 400 });
  }

  const priority = body.priority ?? 2;
  const type     = priority === 1 ? "primary" : "backup";

  // If setting as primary, demote any existing primary for this driver
  if (priority === 1) {
    await sb
      .from("ronyx_driver_truck_assignments")
      .update({ assignment_type: "backup", priority: 2 })
      .eq("driver_id", body.driver_id)
      .eq("assignment_type", "primary");
  }

  const { data, error } = await sb
    .from("ronyx_driver_truck_assignments")
    .upsert({
      oo_id:                    params.id,
      driver_id:                body.driver_id,
      truck_id:                 body.truck_id,
      priority:                 priority,
      assignment_type:          type,
      requires_manager_approval: body.requires_manager_approval ?? false,
      assigned_by:              body.assigned_by || null,
      notes:                    body.notes || null,
      is_active:                true,
    }, { onConflict: "driver_id,truck_id" })
    .select(`
      *,
      driver:ronyx_oo_drivers(id, name),
      truck:ronyx_oo_trucks(id, truck_number, status, type)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}
