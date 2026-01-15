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
        claims: [
          {
            id: "demo-claim-1",
            facility_name: "Border Freight Hub",
            load_reference: "MX-4521",
            status: "submitted",
            claimed_minutes: 30,
            claim_amount: 37.5,
            currency: "USD",
            created_at: new Date().toISOString(),
          },
        ],
      });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      searchParams.get("organization_id"),
    );

    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { data: claims, error } = await supabase
      .from("detention_claims")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ claims: claims || [] });
  } catch (error: any) {
    console.error("Detention claims error:", error);
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
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

    if (!body.claimed_minutes || !body.claim_amount) {
      return NextResponse.json(
        { error: "claimed_minutes and claim_amount are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("detention_claims")
      .insert({
        organization_id: organizationId,
        detention_event_id: body.detention_event_id || null,
        carrier_id: body.carrier_id || null,
        load_reference: body.load_reference || null,
        ticket_id: body.ticket_id || null,
        status: body.status || "draft",
        claimed_minutes: body.claimed_minutes,
        free_minutes: body.free_minutes || 0,
        rate_per_hour: body.rate_per_hour || 75,
        claim_amount: body.claim_amount,
        currency: body.currency || "USD",
        evidence: body.evidence || {},
        photo_urls: body.photo_urls || [],
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ claim: data });
  } catch (error: any) {
    console.error("Create detention claim error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
