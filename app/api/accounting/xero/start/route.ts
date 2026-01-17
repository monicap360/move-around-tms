import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Xero OAuth not configured. Set XERO_CLIENT_ID and XERO_REDIRECT_URI." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organization_id");
  if (!organizationId) {
    return NextResponse.json({ error: "Missing organization_id parameter." }, { status: 400 });
  }

  const state = crypto.randomUUID();
  const authUrl = new URL("https://login.xero.com/identity/connect/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set(
    "scope",
    [
      "openid",
      "profile",
      "email",
      "offline_access",
      "accounting.settings",
      "accounting.transactions",
      "accounting.contacts",
    ].join(" ")
  );
  authUrl.searchParams.set("state", state);

  const res = NextResponse.json({ url: authUrl.toString() });
  res.cookies.set("xero_oauth_state", state, { httpOnly: true, secure: true, path: "/" });
  res.cookies.set("xero_org", organizationId, { httpOnly: true, secure: true, path: "/" });
  return res;
}
