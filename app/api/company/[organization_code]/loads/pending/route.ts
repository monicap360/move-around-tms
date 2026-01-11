import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all pending loads for a given organization
export async function GET(request: Request) {
  try {
    // Extract organization code from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const orgCode = pathParts[pathParts.indexOf("company") + 1];
    if (!orgCode) {
      return NextResponse.json(
        { ok: false, error: "Missing organization code" },
        { status: 400 },
      );
    }
    const { data, error } = await supabaseAdmin
      .from("loads")
      .select("*")
      .eq("status", "Pending")
      .eq("organization_code", orgCode)
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
