import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const state = searchParams.get("state");

  const storedState = req.cookies.get("qb_oauth_state")?.value;
  const organizationId = req.cookies.get("qb_org")?.value;

  if (!code || !realmId || !state || !storedState || state !== storedState || !organizationId) {
    return NextResponse.redirect(new URL("/accounting/integrations?error=quickbooks", req.url));
  }

  const res = await fetch(new URL("/api/accounting/connect", req.url).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization_id: organizationId,
      provider: "quickbooks",
      action: "connect",
      auth_code: code,
      realm_id: realmId,
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/accounting/integrations?error=quickbooks", req.url));
  }

  const response = NextResponse.redirect(new URL("/accounting/integrations?connected=quickbooks", req.url));
  response.cookies.delete("qb_oauth_state");
  response.cookies.delete("qb_org");
  return response;
}
