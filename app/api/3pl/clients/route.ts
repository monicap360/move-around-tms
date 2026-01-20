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
        clients: [
          {
            id: "demo-client-1",
            name: "Acme Aggregates",
            organization_code: "acme-aggregates",
            relationship_type: "3pl_client",
            active: true,
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

    const { data: relationships } = await supabase
      .from("organization_relationships")
      .select("id, child_organization_id, relationship_type, active")
      .eq("parent_organization_id", organizationId)
      .eq("relationship_type", "3pl_client");

    const childIds = (relationships || []).map((r: any) => r.child_organization_id);
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, organization_code")
      .in("id", childIds);

    const orgMap = new Map((orgs || []).map((company: any) => [company.id, company]));

    const clients = (relationships || []).map((rel: any) => ({
      id: rel.id,
      relationship_type: rel.relationship_type,
      active: rel.active,
      ...orgMap.get(rel.child_organization_id),
    }));

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error("3PL clients error:", error);
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
    const { organization_id, client_organization_id } = body;

    const parentOrgId = await resolveOrganizationId(
      supabase,
      user.id,
      organization_id,
    );
    if (!parentOrgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("organization_relationships")
      .insert({
        parent_organization_id: parentOrgId,
        child_organization_id: client_organization_id,
        relationship_type: "3pl_client",
        active: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("3PL clients create error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

