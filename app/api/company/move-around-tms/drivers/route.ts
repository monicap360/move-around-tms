import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all drivers for move-around-tms
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

    const { data, error } = await supabaseAdmin
      .from("drivers")
      .select("*")
      .eq("organization_id", org.id)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch drivers" },
      { status: 500 },
    );
  }
}

// POST: Create a new driver for move-around-tms
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

    const { data, error } = await supabaseAdmin
      .from("drivers")
      .insert({
        ...body,
        organization_id: org.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create driver" },
      { status: 500 },
    );
  }
}
