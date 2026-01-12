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
    const data = await req.json();
    const { organization_id, load_number, origin, destination } = data;

    // Validate required fields
    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 },
      );
    }

    if (!load_number) {
      return NextResponse.json(
        { error: "load_number is required" },
        { status: 400 },
      );
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Sanitize and validate input
    const loadData: any = {
      organization_id,
      load_number: String(load_number).trim(),
      status: data.status || "created",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (origin) loadData.origin = String(origin).substring(0, 500);
    if (destination) loadData.destination = String(destination).substring(0, 500);
    if (data.priority) loadData.priority = Number(data.priority) || 0;
    if (data.estimated_rate) loadData.estimated_rate = Number(data.estimated_rate) || 0;
    if (data.driver_id) loadData.driver_id = data.driver_id;
    if (data.truck_id) loadData.truck_id = data.truck_id;
    if (data.required_endorsement) loadData.required_endorsement = String(data.required_endorsement).substring(0, 100);

    const { data: insertedLoad, error } = await supabase
      .from("loads")
      .insert([loadData])
      .select()
      .single();

    if (error) {
      console.error("Load creation error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create load" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, load: insertedLoad });
  } catch (err: any) {
    console.error("Load creation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create load" },
      { status: 500 },
    );
  }
}
