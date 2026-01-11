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

    // Build queries with optional organization filter
    let scansQuery = supabase.from("scans").select("*").order("created_at", { ascending: false });
    let documentsQuery = supabase.from("driver_documents").select("*").order("created_at", { ascending: false });
    let resultsQuery = supabase.from("compliance_results").select("*").order("created_at", { ascending: false });
    let ticketsQuery = supabase.from("aggregate_tickets").select("*").order("created_at", { ascending: false });

    if (organizationId) {
      scansQuery = scansQuery.eq("organization_id", organizationId);
      documentsQuery = documentsQuery.eq("organization_id", organizationId);
      resultsQuery = resultsQuery.eq("organization_id", organizationId);
      ticketsQuery = ticketsQuery.eq("organization_id", organizationId);
    }

    const [scansRes, documentsRes, resultsRes, ticketsRes] = await Promise.all([
      scansQuery,
      documentsQuery,
      resultsQuery,
      ticketsQuery,
    ]);

    return NextResponse.json({
      scans: scansRes.data || [],
      documents: documentsRes.data || [],
      results: resultsRes.data || [],
      tickets: ticketsRes.data || [],
    });
  } catch (error: any) {
    console.error("Error fetching compliance data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch compliance data" },
      { status: 500 },
    );
  }
}
