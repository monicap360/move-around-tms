// app/api/debug-production/route.ts
import { NextResponse } from "next/server";

// Handles GET requests to /api/debug-production
export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      message: "Debug production endpoint is working ✅",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "not set",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "set ✅"
        : "not set ❌",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
