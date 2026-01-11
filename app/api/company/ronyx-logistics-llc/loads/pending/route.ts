import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all pending loads for ronyx-logistics-llc
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("status", "Pending")
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
