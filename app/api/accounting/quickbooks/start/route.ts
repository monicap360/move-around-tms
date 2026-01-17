import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "QuickBooks OAuth not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_REDIRECT_URI." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json({ error: "Missing organization_id parameter." }, { status: 400 });
  }

  const state = crypto.randomUUID();
  const authUrl = new URL("https://appcenter.intuit.com/connect/oauth2");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  authUrl.searchParams.set("state", state);

  const res = NextResponse.json({ url: authUrl.toString() });
  res.cookies.set("qb_oauth_state", state, { httpOnly: true, secure: true, path: "/" });
  res.cookies.set("qb_org", organizationId, { httpOnly: true, secure: true, path: "/" });
  return res;
}
