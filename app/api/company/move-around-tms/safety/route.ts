import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all safety records for move-around-tms
export async function GET() {
  try {
    // Get organization_id for move-around-tms
    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "move-around-tms")
      .single();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Try safety_records table, fallback to violations if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from("safety_records")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback to violations table if safety_records doesn't exist
      const { data: violationsData, error: violationsError } = await supabaseAdmin
        .from("violations")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (violationsError) {
        return NextResponse.json(
          { error: violationsError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(violationsData || []);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch safety records" },
      { status: 500 },
    );
  }
}

// POST: Create a new safety record for move-around-tms
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get organization_id for move-around-tms
    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "move-around-tms")
      .single();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Try safety_records table, fallback to violations if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from("safety_records")
      .insert({
        ...body,
        organization_id: organization.id,
      })
      .select()
      .single();

    if (error) {
      // Fallback to violations table if safety_records doesn't exist
      const { data: violationsData, error: violationsError } = await supabaseAdmin
        .from("violations")
        .insert({
          ...body,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (violationsError) {
        return NextResponse.json(
          { error: violationsError.message },
          { status: 500 },
        );
      }

      return NextResponse.json(violationsData, { status: 201 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create safety record" },
      { status: 500 },
    );
  }
}
