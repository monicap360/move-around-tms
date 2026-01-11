import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Simple health check to validate server-side connectivity to Supabase.
// Does a lightweight query using the service role key. Returns { ok: true }
// when the connection and query succeed, with basic metadata for debugging.

export async function GET() {
  try {
    // Pick a lightweight table that exists in this app; fallback to auth schema if needed
    // We use `head: true` to avoid transferring rows; we only need to validate the round-trip.
    const { error, count } = await supabaseAdmin
      .from("drivers")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, stage: "select(drivers)", error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, count: count ?? 0 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, stage: "unexpected", error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
