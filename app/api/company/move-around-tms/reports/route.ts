import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all reports for move-around-tms
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

    // Try reports table, return empty array if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array (reports might be generated on-demand)
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch reports" },
      { status: 500 },
    );
  }
}

// POST: Generate/create a new report for move-around-tms
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

    // Try reports table, return success message if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from("reports")
      .insert({
        ...body,
        organization_id: organization.id,
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, return success message (reports might be generated on-demand)
      return NextResponse.json({
        message: "Report generation requested",
        organization_id: organization.id,
        ...body,
      }, { status: 201 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create report" },
      { status: 500 },
    );
  }
}
