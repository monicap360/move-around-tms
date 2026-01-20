import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function exchangeQuickBooksToken(authCode: string) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
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
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const payload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(payload?.error_description || "QuickBooks token exchange failed.");
  }

  return payload;
}

async function exchangeXeroToken(authCode: string) {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Xero OAuth is not configured.");
  }

  const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const payload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(payload?.error_description || "Xero token exchange failed.");
  }

  const connectionsRes = await fetch("https://api.xero.com/connections", {
    headers: {
      Authorization: `Bearer ${payload.access_token}`,
      Accept: "application/json",
    },
  });

  const connections = await connectionsRes.json();
  if (!connectionsRes.ok || !Array.isArray(connections) || connections.length === 0) {
    throw new Error("Unable to fetch Xero company.");
  }

  return { ...payload, tenant_id: connections[0]?.tenantId };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { organization_id, provider, action, auth_code, realm_id, tenant_id } = body;

    if (!organization_id || !provider || !action) {
      return NextResponse.json(
        { error: "Missing required fields: organization_id, provider, action" },
        { status: 400 }
      );
    }

    if (!["quickbooks", "xero"].includes(provider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: quickbooks, xero` },
        { status: 400 }
      );
    }

    if (action === "connect") {
      if (!auth_code) {
        return NextResponse.json({ error: "auth_code required for connect action" }, { status: 400 });
      }

      if (provider === "quickbooks") {
        const tokenPayload = await exchangeQuickBooksToken(auth_code);
        const expiresAt = tokenPayload.expires_in
          ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
          : null;

        const { data, error } = await supabase
          .from("accounting_integrations")
          .upsert(
            {
              organization_id,
              provider,
              access_token: tokenPayload.access_token,
              refresh_token: tokenPayload.refresh_token,
              realm_id: realm_id || null,
              tenant_id: tenant_id || null,
              expires_at: expiresAt,
              active: true,
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "organization_id,provider" }
          )
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `${provider} connected successfully`,
          integration: data,
        });
      }

      const tokenPayload = await exchangeXeroToken(auth_code);
      const expiresAt = tokenPayload.expires_in
        ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("accounting_integrations")
        .upsert(
          {
            organization_id,
            provider,
            access_token: tokenPayload.access_token,
            refresh_token: tokenPayload.refresh_token,
            realm_id: null,
            tenant_id: tokenPayload.tenant_id || tenant_id || null,
            expires_at: expiresAt,
            active: true,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,provider" }
        )
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${provider} connected successfully`,
        integration: data,
      });
    }

    if (action === "disconnect") {
      const { error } = await supabase
        .from("accounting_integrations")
        .update({
          active: false,
          disconnected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organization_id)
        .eq("provider", provider);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${provider} disconnected successfully`,
      });
    }

    return NextResponse.json(
      { error: `Invalid action: ${action}. Supported: connect, disconnect` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Accounting connect error:", err);
    return NextResponse.json({ error: err.message || "Accounting connection failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get("organization_id");
    const provider = searchParams.get("provider");

    if (!organization_id) {
      return NextResponse.json({ error: "Missing organization_id parameter" }, { status: 400 });
    }

    let query = supabase
      .from("accounting_integrations")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("active", true);

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ integrations: data || [], count: data?.length || 0 });
  } catch (err: any) {
    console.error("Accounting connect status error:", err);
    return NextResponse.json({ error: err.message || "Failed to get connection status" }, { status: 500 });
  }
}

