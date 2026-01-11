import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST: Update load status, ETA, location, etc.
export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { load_id, status, eta, location, notes } = body;

    if (!load_id) {
      return NextResponse.json(
        { error: "load_id is required" },
        { status: 400 },
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (eta) updateData.eta = eta;
    if (location) {
      updateData.current_location = location;
      if (location.latitude && location.longitude) {
        updateData.latitude = location.latitude;
        updateData.longitude = location.longitude;
      }
    }
    if (notes) updateData.notes = notes;

    const { error: updateError } = await supabase
      .from("loads")
      .update(updateData)
      .eq("id", load_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, load_id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Status update failed" },
      { status: 500 },
    );
  }
}
