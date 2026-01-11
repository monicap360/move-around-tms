import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// POST: Auto-assign a truck to a pending load
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { load_id, required_truck_type } = body;

    // Find the first available truck of the required type
    let truckQuery = supabaseAdmin
      .from("trucks")
      .select("*")
      .eq("status", "Ready");
    if (required_truck_type)
      truckQuery = truckQuery.eq("truck_type", required_truck_type);
    const { data: trucks, error: truckError } = await truckQuery.limit(1);
    if (truckError) throw truckError;
    if (!trucks || trucks.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No available truck found." },
        { status: 200 },
      );
    }
    const assignedTruck = trucks[0];

    // Optionally, update the load assignment
    if (load_id) {
      const { error: assignError } = await supabaseAdmin
        .from("loads")
        .update({ truck_id: assignedTruck.id, status: "Dispatched" })
        .eq("id", load_id);
      if (assignError) {
        return NextResponse.json(
          { ok: false, message: assignError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true, truck: assignedTruck });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Dispatch auto-assign failed" },
      { status: 500 },
    );
  }
}
