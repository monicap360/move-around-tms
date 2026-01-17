import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function refreshQuickBooksToken(refreshToken: string) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("QuickBooks OAuth is not configured.");
  }

  const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const payload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(payload?.error_description || "QuickBooks token refresh failed.");
  }

  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const { organization_id } = await req.json();
    if (!organization_id) {
      return NextResponse.json({ error: "Missing organization_id." }, { status: 400 });
    }

    const supabase = createServerAdmin();
    const { data: integration, error } = await supabase
      .from("accounting_integrations")
      .select("refresh_token, expires_at")
      .eq("organization_id", organization_id)
      .eq("provider", "quickbooks")
      .eq("active", true)
      .single();

    if (error || !integration?.refresh_token) {
      return NextResponse.json({ error: "QuickBooks integration not found." }, { status: 404 });
    }

    const refreshed = await refreshQuickBooksToken(integration.refresh_token);
    const newExpiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : integration.expires_at;

    await supabase
      .from("accounting_integrations")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token || integration.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organization_id)
      .eq("provider", "quickbooks");

    return NextResponse.json({ success: true, expires_at: newExpiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "QuickBooks refresh failed." }, { status: 500 });
  }
}
