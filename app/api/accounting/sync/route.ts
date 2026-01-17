import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { accountingProviders } from "@/integrations/accounting";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { organization_id, provider, sync_type, items } = body;

    if (!organization_id || !provider || !sync_type) {
      return NextResponse.json(
        { error: "Missing required fields: organization_id, provider, sync_type" },
        { status: 400 }
      );
    }

    const accountingProvider = accountingProviders[provider];
    if (!accountingProvider) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: quickbooks, xero` },
        { status: 400 }
      );
    }

    const { data: config, error: configError } = await supabase
      .from("accounting_integrations")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("provider", provider)
      .eq("active", true)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: `Accounting integration not configured for ${provider}. Please connect your account first.` },
        { status: 404 }
      );
    }

    let syncResult: any;
    switch (sync_type) {
      case "invoices":
        if (!items || !Array.isArray(items)) {
          return NextResponse.json({ error: "Items array required for invoice sync" }, { status: 400 });
        }
        syncResult = await accountingProvider.syncInvoices(items);
        break;
      case "payments":
        if (!items || !Array.isArray(items)) {
          return NextResponse.json({ error: "Items array required for payment sync" }, { status: 400 });
        }
        syncResult = await accountingProvider.syncPayments(items);
        break;
      case "customers":
        if (!items || !Array.isArray(items)) {
          return NextResponse.json({ error: "Items array required for customer sync" }, { status: 400 });
        }
        syncResult = await accountingProvider.syncCustomers(items);
        break;
      case "vendors":
        if (!items || !Array.isArray(items)) {
          return NextResponse.json({ error: "Items array required for vendor sync" }, { status: 400 });
        }
        syncResult = await accountingProvider.syncVendors(items);
        break;
      default:
        return NextResponse.json(
          { error: `Invalid sync_type: ${sync_type}. Supported: invoices, payments, customers, vendors` },
          { status: 400 }
        );
    }

    await supabase.from("accounting_sync_log").insert({
      organization_id,
      provider,
      sync_type,
      items_count: items?.length || 0,
      success_count: syncResult?.filter((r: any) => r.sync_status === "success")?.length || 0,
      error_count: syncResult?.filter((r: any) => r.sync_status === "error")?.length || 0,
      status: "completed",
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      sync_type,
      provider,
      items_synced: syncResult?.length || 0,
      results: syncResult,
    });
  } catch (err: any) {
    console.error("Accounting sync error:", err);
    return NextResponse.json({ error: err.message || "Accounting sync failed" }, { status: 500 });
  }
}
