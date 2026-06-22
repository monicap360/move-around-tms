import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const getOrgId = () => process.env.RONYX_ORG_ID ?? null;

// POST /api/integrations/saferwatch/connect
// Body: { api_key, user_key, api_url?, webhook_secret? }
export async function POST(req: Request) {
  try {
    const orgId = getOrgId();
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    const body = await req.json();
    const { api_key, user_key, api_url, webhook_secret } = body;
    if (!api_key || !user_key) {
      return NextResponse.json({ error: "api_key and user_key are required." }, { status: 400 });
    }

    const credentials = {
      api_key,
      user_key,
      api_url:        api_url || "https://api.saferwatch.com/api/v1",
      webhook_secret: webhook_secret || null,
    };

    let testPassed = false;
    let testError = null;
    try {
      const testRes = await fetch(`${credentials.api_url}/ping`, {
        headers: { "X-API-Key": api_key, "X-User-Key": user_key },
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
        provider:              "saferwatch",
        status:                testPassed ? "connected" : "error",
        encrypted_credentials: credentials,
        last_sync_error:       testPassed ? null : testError,
        updated_at:            new Date().toISOString(),
      }, { onConflict: "organization_id,provider" });

    if (error) throw error;

    return NextResponse.json({
      ok:     true,
      status: testPassed ? "connected" : "error",
      note:   testPassed ? "SaferWatch connected." : `Credentials saved but test failed: ${testError}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const orgId = getOrgId();
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });
    await supabaseAdmin
      .from("integration_connections")
      .update({ status: "disconnected", encrypted_credentials: null, updated_at: new Date().toISOString() })
      .eq("organization_id", orgId).eq("provider", "saferwatch");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
