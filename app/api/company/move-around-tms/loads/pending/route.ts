import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all pending loads for move-around-tms
export async function GET(request: Request) {
  try {
    // Get organization_id for move-around-tms
    const { data: company, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "move-around-tms")
      .single();

    if (orgError || !company) {
      return NextResponse.json(
        { ok: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("status", "Pending")
      .eq("organization_id", company.id)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return NextResponse.json({ ok: true, loads: data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch pending loads" },
      { status: 500 },
    );
  }
}

