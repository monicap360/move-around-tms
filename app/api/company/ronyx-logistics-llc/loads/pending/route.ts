import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all pending loads for ronyx-logistics-llc
export async function GET() {
  try {
    // Get organization_id for ronyx-logistics-llc
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("organization_code", "ronyx-logistics-llc")
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { ok: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("status", "Pending")
      .eq("organization_id", org.id)
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
