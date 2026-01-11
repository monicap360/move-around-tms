import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    // Try multiple possible table names
    const scanQueries = [
      supabase.from("fastscan_uploads").select("*").order("uploaded_at", { ascending: false }),
      supabase.from("scans").select("*").order("created_at", { ascending: false }),
    ];

    let scans: any[] = [];
    for (const query of scanQueries) {
      let filteredQuery = query;
      if (organizationId) {
        filteredQuery = filteredQuery.eq("organization_id", organizationId);
      }
      const { data, error } = await filteredQuery;
      if (!error && data && data.length > 0) {
        scans = data;
        break;
      }
    }

    // Filter by organization if provided (fallback if table doesn't have organization_id)
    if (organizationId && scans.length > 0) {
      scans = scans.filter((scan) => scan.organization_id === organizationId);
    }

    return NextResponse.json({ scans });
  } catch (error: any) {
    console.error("Error listing scans:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list scans" },
      { status: 500 },
    );
  }
}
