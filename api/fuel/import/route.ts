import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fuelCardProviders } from "@/integrations/fuel";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/fuel/import
// Import fuel transactions from fuel card provider (Comdata, WEX, etc.)
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { organization_id, provider, start_date, end_date } = body;

    if (!organization_id || !provider || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: organization_id, provider, start_date, end_date" },
        { status: 400 },
      );
    }

    // Validate provider
    const fuelProvider = fuelCardProviders[provider];
    if (!fuelProvider) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: comdata, wex` },
        { status: 400 },
      );
    }

    // Get fuel card config from database
    const { data: config, error: configError } = await supabase
      .from("fuel_card_accounts")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("provider", provider)
      .eq("active", true)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: `Fuel card account not configured for ${provider}. Please add your fuel card account first.` },
        { status: 404 },
      );
    }

    // Fetch transactions from fuel card provider
    const transactions = await fuelProvider.fetchTransactions(start_date, end_date);

    // Transform and import transactions
    const purchases = transactions.map((transaction: any) => ({
      organization_id,
      transaction_id: transaction.transaction_id || transaction.id,
      card_number: transaction.card_number || transaction.card_id,
      driver_id: transaction.driver_id || null,
      truck_id: transaction.truck_id || transaction.vehicle_id || null,
      location: transaction.location || transaction.address || "",
      gallons: Number(transaction.gallons || transaction.quantity || 0),
      cost_per_gallon: Number(transaction.cost_per_gallon || transaction.price_per_gallon || 0),
      total_cost: Number(transaction.total_cost || transaction.amount || 0),
      fuel_type: transaction.fuel_type || "Diesel",
      transaction_date: transaction.transaction_date || transaction.date || transaction.timestamp,
      odometer: transaction.odometer || null,
      provider: provider,
      source: "import",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Insert purchases (with conflict handling for duplicate transactions)
    const { data: insertedData, error: insertError } = await supabase
      .from("fuel_purchases")
      .upsert(purchases, {
        onConflict: "organization_id,transaction_id,provider",
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) {
      console.error("Fuel purchase import error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    // Log import
    await supabase.from("fuel_import_log").insert({
      organization_id,
      provider,
      start_date,
      end_date,
      transactions_imported: insertedData?.length || 0,
      status: "completed",
      imported_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      provider,
      transactions_imported: insertedData?.length || 0,
      purchases: insertedData,
    });
  } catch (err: any) {
    console.error("Fuel import error:", err);
    return NextResponse.json(
      { error: err.message || "Fuel import failed" },
      { status: 500 },
    );
  }
}
