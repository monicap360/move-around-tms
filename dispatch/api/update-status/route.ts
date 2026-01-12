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
    const { load_id, status, eta, location, notes, organization_id } = body;

    if (!load_id) {
      return NextResponse.json(
        { error: "load_id is required" },
        { status: 400 },
      );
    }

    // Verify load exists and get organization_id
    const { data: load, error: loadFetchError } = await supabase
      .from("loads")
      .select("id, organization_id")
      .eq("id", load_id)
      .single();

    if (loadFetchError || !load) {
      return NextResponse.json(
        { error: "Load not found" },
        { status: 404 },
      );
    }

    const orgId = organization_id || load.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Validate input types
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status && typeof status === 'string') updateData.status = status;
    if (eta) {
      // Validate ETA is a valid date string
      const etaDate = new Date(eta);
      if (!isNaN(etaDate.getTime())) {
        updateData.eta = eta;
      }
    }
    if (location) {
      if (typeof location === 'object') {
        updateData.current_location = location;
        if (location.latitude && location.longitude) {
          const lat = Number(location.latitude);
          const lng = Number(location.longitude);
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            updateData.latitude = lat;
            updateData.longitude = lng;
          }
        }
      }
    }
    if (notes && typeof notes === 'string') updateData.notes = notes.substring(0, 5000); // Limit length

    const { error: updateError } = await supabase
      .from("loads")
      .update(updateData)
      .eq("id", load_id)
      .eq("organization_id", orgId);

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
