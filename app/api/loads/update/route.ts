import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { id, organization_id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "load id is required" },
        { status: 400 },
      );
    }

    // Verify load exists and get organization_id
    const { data: load, error: loadFetchError } = await supabase
      .from("loads")
      .select("id, organization_id")
      .eq("id", id)
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

    // Sanitize update fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only allow specific fields to be updated
    const allowedFields = [
      "status", "origin", "destination", "priority", "estimated_rate",
      "final_rate", "driver_id", "truck_id", "eta", "current_location",
      "latitude", "longitude", "notes", "required_endorsement"
    ];

    for (const field of allowedFields) {
      if (fields[field] !== undefined) {
        if (typeof fields[field] === 'string') {
          // Limit string lengths
          const maxLengths: { [key: string]: number } = {
            origin: 500,
            destination: 500,
            notes: 5000,
            required_endorsement: 100,
          };
          const maxLen = maxLengths[field] || 255;
          updateData[field] = String(fields[field]).substring(0, maxLen);
        } else if (typeof fields[field] === 'number') {
          updateData[field] = Number(fields[field]);
        } else {
          updateData[field] = fields[field];
        }
      }
    }

    // Validate coordinates if provided
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      const lat = Number(updateData.latitude);
      const lng = Number(updateData.longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: "Invalid latitude or longitude values" },
          { status: 400 },
        );
      }
    }

    const { error } = await supabase
      .from("loads")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", orgId);

    if (error) {
      console.error("Load update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update load" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Load update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update load" },
      { status: 500 },
    );
  }
}
