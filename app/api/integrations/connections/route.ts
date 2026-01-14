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
        connections: [
          { provider: "motive", status: "connected", last_synced_at: null },
          { provider: "geotab", status: "not_configured", last_synced_at: null },
          { provider: "quickbooks", status: "pending", last_synced_at: null },
          { provider: "xero", status: "not_configured", last_synced_at: null },
          { provider: "dat", status: "not_configured", last_synced_at: null },
          { provider: "truckstop", status: "not_configured", last_synced_at: null },
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

    const { data: connections, error } = await supabase
      .from("integration_connections")
      .select("provider, status, last_synced_at, metadata")
      .eq("organization_id", organizationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error("Integrations error:", error);
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

    const { error } = await supabase
      .from("integration_connections")
      .upsert({
        organization_id: organizationId,
        provider: body.provider,
        status: body.status || "pending",
        metadata: body.metadata || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,provider" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Integrations update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
