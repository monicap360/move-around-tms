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
        profiles: [
          {
            id: "demo-profile-1",
            client_name: "Acme Aggregates",
            billing_model: "margin",
            margin_rate: 12,
            fee_rate: 0,
            active: true,
          },
        ],
        summaries: [
          {
            client_name: "Acme Aggregates",
            total_billed: 45000,
            total_invoices: 6,
            estimated_margin: 5400,
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

    const { data: profiles } = await supabase
      .from("3pl_billing_profiles")
      .select("id, client_organization_id, billing_model, margin_rate, fee_rate, active")
      .eq("organization_id", organizationId);

    const clientIds = (profiles || []).map((p: any) => p.client_organization_id);
    const { data: clientOrgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", clientIds);
    const clientMap = new Map(
      (clientOrgs || []).map((organization: any) => [
        organization.id,
        organization.name,
      ]),
    );

    const enrichedProfiles = (profiles || []).map((profile: any) => ({
      ...profile,
      client_name: clientMap.get(profile.client_organization_id) || "Unknown",
    }));

    const { data: invoices } = await supabase
      .from("invoices")
      .select("client_organization_id, total, billing_model, margin_rate, fee_rate")
      .eq("organization_id", organizationId)
      .not("client_organization_id", "is", null);

    const summaryMap = new Map<string, { total: number; count: number; margin: number }>();
    (invoices || []).forEach((inv: any) => {
      const key = inv.client_organization_id;
      if (!key) return;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, { total: 0, count: 0, margin: 0 });
      }
      const entry = summaryMap.get(key)!;
      entry.total += Number(inv.total) || 0;
      entry.count += 1;
      const marginRate = Number(inv.margin_rate) || 0;
      const feeRate = Number(inv.fee_rate) || 0;
      if (inv.billing_model === "margin") {
        entry.margin += (Number(inv.total) || 0) * (marginRate / 100);
      } else if (inv.billing_model === "percent") {
        entry.margin += (Number(inv.total) || 0) * (feeRate / 100);
      }
    });

    const summaries = Array.from(summaryMap.entries()).map(([clientId, data]) => ({
      client_name: clientMap.get(clientId) || "Unknown",
      total_billed: data.total,
      total_invoices: data.count,
      estimated_margin: data.margin,
    }));

    return NextResponse.json({ profiles: enrichedProfiles, summaries });
  } catch (error: any) {
    console.error("3PL billing error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({ success: true });
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

    const payload = {
      organization_id: organizationId,
      client_organization_id: body.client_organization_id,
      billing_model: body.billing_model || "pass_through",
      margin_rate: body.margin_rate || 0,
      fee_rate: body.fee_rate || 0,
      currency: body.currency || "USD",
      terms: body.terms || null,
      active: body.active !== false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("3pl_billing_profiles")
      .upsert(payload, { onConflict: "organization_id,client_organization_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("3PL billing update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
