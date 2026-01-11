import { supabase } from "../../lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Test basic connectivity
    const { data, error } = await supabase.auth.getSession();

    return NextResponse.json({
      status: "Connection test successful",
      hasError: !!error,
      error: error?.message || null,
      hasSession: !!data.session,
      timestamp: new Date().toISOString(),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set",
      keyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "Connection failed",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
