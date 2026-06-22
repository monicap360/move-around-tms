import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from("ronyx_loads").select("id").limit(1);
    return NextResponse.json({
      status: "ok",
      connected: !error,
      error: error?.message ?? null,
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set",
      keyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
