import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runAggregateReconciliation } from "@/lib/aggregates/reconciliation";

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

export async function POST(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({
        runId: "demo-agg-run",
        inputCounts: { tickets: 20, labResults: 10, deliveryProofs: 15, invoices: 12 },
        matchedCount: 14,
        exceptionCount: 6,
      });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      body.organization_id,
    );
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const result = await runAggregateReconciliation({
      organizationId,
      scaleTolerancePct: Number(body.scaleTolerancePct || 2),
      moistureTolerancePct: Number(body.moistureTolerancePct || 1),
      finesTolerancePct: Number(body.finesTolerancePct || 1),
      priceVariancePct: Number(body.priceVariancePct || 5),
      deliveryWindowHours: Number(body.deliveryWindowHours || 12),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Aggregate reconciliation run error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
