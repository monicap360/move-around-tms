import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// POST /api/integrations/mycarrierportal/connect
// MyCarrierPortal (Descartes) — marks as pending/requested until Descartes provides API access.
export async function POST(req: Request) {
  try {
    const orgId = (await resolveOrgId());
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    const body = await req.json();
    const { api_key, organization_id: mcpOrgId, contact_email, notes } = body;

    await supabaseAdmin
      .from("integration_connections")
      .upsert({
        organization_id:       orgId,
        provider:              "mycarrierportal",
        status:                api_key ? "connected" : "disconnected",
        encrypted_credentials: api_key ? { api_key, organization_id: mcpOrgId || null } : null,
        settings:              { contact_email: contact_email || null, notes: notes || null, requested_at: new Date().toISOString() },
        updated_at:            new Date().toISOString(),
      }, { onConflict: "organization_id,provider" });

    return NextResponse.json({
      ok: true,
      note: api_key
        ? "MyCarrierPortal credentials saved."
        : "Integration request recorded. Contact Descartes to obtain API credentials.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
