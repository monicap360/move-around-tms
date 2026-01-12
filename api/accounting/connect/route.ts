import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/accounting/connect
// Connect/disconnect accounting integration
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { organization_id, provider, action, auth_code, realm_id, tenant_id } = body;

    if (!organization_id || !provider || !action) {
      return NextResponse.json(
        { error: "Missing required fields: organization_id, provider, action" },
        { status: 400 },
      );
    }

    if (!['quickbooks', 'xero'].includes(provider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: quickbooks, xero` },
        { status: 400 },
      );
    }

    if (action === 'connect') {
      // For OAuth flow, exchange auth_code for access_token
      // This is a simplified version - full OAuth implementation needed
      if (!auth_code) {
        return NextResponse.json(
          { error: "auth_code required for connect action" },
          { status: 400 },
        );
      }

      // Exchange auth code for tokens (stub - implement actual OAuth)
      const accessToken = `token_${Date.now()}`; // Stub
      const refreshToken = `refresh_${Date.now()}`; // Stub

      // Store integration config
      const { data, error } = await supabase
        .from("accounting_integrations")
        .upsert({
          organization_id,
          provider,
          access_token: accessToken, // In production, encrypt this
          refresh_token: refreshToken, // In production, encrypt this
          realm_id: realm_id || null, // QuickBooks company ID
          tenant_id: tenant_id || null, // Xero tenant ID
          active: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,provider',
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `${provider} connected successfully`,
        integration: data,
      });
    } else if (action === 'disconnect') {
      // Disconnect integration
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
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `${provider} disconnected successfully`,
      });
    } else {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Supported: connect, disconnect` },
        { status: 400 },
      );
    }
  } catch (err: any) {
    console.error("Accounting connect error:", err);
    return NextResponse.json(
      { error: err.message || "Accounting connection failed" },
      { status: 500 },
    );
  }
}

// GET /api/accounting/connect
// Get connection status
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get("organization_id");
    const provider = searchParams.get("provider");

    if (!organization_id) {
      return NextResponse.json(
        { error: "Missing organization_id parameter" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      integrations: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Accounting connect status error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get connection status" },
      { status: 500 },
    );
  }
}
