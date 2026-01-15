import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveOrganizationId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  requestedOrgId?: string | null,
) {
  if (!requestedOrgId) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();
    return orgMember?.organization_id || null;
  }

  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", requestedOrgId)
    .single();

  return orgMember?.organization_id || null;
}

export async function GET(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({
        runs: [{ id: "demo-agg-run", status: "completed", matched_count: 14, exception_count: 6 }],
        results: [
          {
            id: "demo-agg-result",
            ticket_number: "T-1001",
            status: "exception",
            quantity_variance_pct: 5.4,
          },
        ],
        exceptions: [
          {
            id: "demo-agg-ex",
            exception_type: "weight_mismatch",
            severity: "high",
            explanation: "Scale variance 5.4% exceeds tolerance.",
          },
        ],
      });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedOrgId = searchParams.get("organization_id");
    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      requestedOrgId,
    );
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: runs } = await supabase
      .from("aggregate_reconciliation_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(5);

    const { data: results } = await supabase
      .from("aggregate_reconciliation_results")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: exceptions } = await supabase
      .from("aggregate_reconciliation_exceptions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ runs, results, exceptions });
  } catch (error: any) {
    console.error("Aggregate reconciliation results error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
