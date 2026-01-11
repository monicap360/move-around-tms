import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all HR records for move-around-tms
export async function GET() {
  try {
    // Get organization_id for move-around-tms
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "move-around-tms")
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Try hr_records table, fallback to driver_applications if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from("hr_records")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback to driver_applications table if hr_records doesn't exist
      const { data: applicationsData, error: applicationsError } = await supabaseAdmin
        .from("driver_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (applicationsError) {
        return NextResponse.json(
          { error: applicationsError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(applicationsData || []);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch HR records" },
      { status: 500 },
    );
  }
}

// POST: Create a new HR record for move-around-tms
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get organization_id for move-around-tms
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "move-around-tms")
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Try hr_records table, fallback to driver_applications if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from("hr_records")
      .insert({
        ...body,
        organization_id: org.id,
      })
      .select()
      .single();

    if (error) {
      // Fallback to driver_applications table if hr_records doesn't exist
      const { data: applicationsData, error: applicationsError } = await supabaseAdmin
        .from("driver_applications")
        .insert({
          ...body,
        })
        .select()
        .single();

      if (applicationsError) {
        return NextResponse.json(
          { error: applicationsError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(applicationsData, { status: 201 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create HR record" },
      { status: 500 },
    );
  }
}
