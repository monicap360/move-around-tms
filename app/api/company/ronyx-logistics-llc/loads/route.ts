import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all loads for ronyx-logistics-llc
export async function GET() {
  try {
    // Get organization_id for ronyx-logistics-llc
    const { data: company, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "ronyx-logistics-llc")
      .single();

    if (orgError || !company) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("organization_id", company.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch loads" },
      { status: 500 },
    );
  }
}

// POST: Create a new load for ronyx-logistics-llc
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get organization_id for ronyx-logistics-llc
    const { data: company, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "ronyx-logistics-llc")
      .single();

    if (orgError || !company) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("loads")
      .insert({
        ...body,
        organization_id: company.id,
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
      { error: err.message || "Failed to create load" },
      { status: 500 },
    );
  }
}

