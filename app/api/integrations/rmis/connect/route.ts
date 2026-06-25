import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// POST /api/integrations/rmis/connect
// Body: { client_id, client_secret, api_url?, webhook_secret? }
// Credentials stored server-side only — never returned to client.
export async function POST(req: Request) {
  try {
    const orgId = (await resolveOrgId());
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    const body = await req.json();
    const { client_id, client_secret, api_url, webhook_secret } = body;

    if (!client_id || !client_secret) {
      return NextResponse.json({ error: "client_id and client_secret are required." }, { status: 400 });
    }

    const credentials = {
      client_id,
      client_secret,
      api_url: api_url || "https://ws.rmis.com/carrier",
      webhook_secret: webhook_secret || null,
    };

    // Test connection before saving
    let testPassed = false;
    let testError = null;
    try {
      const testRes = await fetch(`${credentials.api_url}/ping`, {
        headers: { "X-Client-Id": client_id, "X-Client-Secret": client_secret },
        signal: AbortSignal.timeout(8000),
      });
      testPassed = testRes.ok;
      if (!testPassed) testError = `Provider returned ${testRes.status}`;
    } catch (e: any) {
      testError = e.message;
    }

    const { error } = await supabaseAdmin
      .from("integration_connections")
      .upsert({
        organization_id:       orgId,
        provider:              "rmis",
        status:                testPassed ? "connected" : "error",
        encrypted_credentials: credentials,
        last_sync_error:       testPassed ? null : testError,
        updated_at:            new Date().toISOString(),
      }, { onConflict: "organization_id,provider" });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      status: testPassed ? "connected" : "error",
      note: testPassed
        ? "RMIS connected successfully."
        : `Credentials saved but connection test failed: ${testError}. Verify your API URL and credentials.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/integrations/rmis/connect — disconnect
export async function DELETE() {
  try {
    const orgId = (await resolveOrgId());
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    await supabaseAdmin
      .from("integration_connections")
      .update({ status: "disconnected", encrypted_credentials: null, updated_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("provider", "rmis");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
