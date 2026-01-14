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
        enabled: true,
        lastUpdated: new Date().toISOString(),
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

    const { data: org } = await supabase
      .from("organizations")
      .select("enable_mexican_compliance, updated_at")
      .eq("id", organizationId)
      .single();

    return NextResponse.json({
      enabled: Boolean(org?.enable_mexican_compliance),
      lastUpdated: org?.updated_at || null,
    });
  } catch (error: any) {
    console.error("Cross-border status error:", error);
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
    const requestedOrgId = body.organization_id || null;
    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      requestedOrgId,
    );

    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("organizations")
      .update({ enable_mexican_compliance: Boolean(body.enabled) })
      .eq("id", organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cross-border update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
