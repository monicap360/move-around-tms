import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = req.cookies.get("xero_oauth_state")?.value;
  const organizationId = req.cookies.get("xero_org")?.value;

  if (!code || !state || !storedState || state !== storedState || !organizationId) {
    return NextResponse.redirect(new URL("/accounting/integrations?error=xero", req.url));
  }

  const res = await fetch(new URL("/api/accounting/connect", req.url).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization_id: organizationId,
      provider: "xero",
      action: "connect",
      auth_code: code,
    }),
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/accounting/integrations?error=xero", req.url));
  }

  const response = NextResponse.redirect(new URL("/accounting/integrations?connected=xero", req.url));
  response.cookies.delete("xero_oauth_state");
  response.cookies.delete("xero_org");
  return response;
}
