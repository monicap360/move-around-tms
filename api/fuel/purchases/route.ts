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

// GET /api/fuel/purchases
// Get fuel purchases for an organization
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get("organization_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const driver_id = searchParams.get("driver_id");
    const truck_id = searchParams.get("truck_id");

    if (!organization_id) {
      return NextResponse.json(
        { error: "Missing organization_id parameter" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("fuel_purchases")
      .select("*")
      .eq("organization_id", organization_id)
      .order("transaction_date", { ascending: false });

    if (start_date) {
      query = query.gte("transaction_date", start_date);
    }
    if (end_date) {
      query = query.lte("transaction_date", end_date);
    }
    if (driver_id) {
      query = query.eq("driver_id", driver_id);
    }
    if (truck_id) {
      query = query.eq("truck_id", truck_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      purchases: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Fuel purchases fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch fuel purchases" },
      { status: 500 },
    );
  }
}

// POST /api/fuel/purchases
// Create a fuel purchase record (manual entry or import from fuel card)
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const {
      organization_id,
      transaction_id,
      card_number,
      driver_id,
      truck_id,
      location,
      gallons,
      cost_per_gallon,
      total_cost,
      fuel_type,
      transaction_date,
      odometer,
      provider,
      source, // 'manual' or 'import'
    } = body;

    if (!organization_id || !location || !gallons || !total_cost || !transaction_date) {
      return NextResponse.json(
        { error: "Missing required fields: organization_id, location, gallons, total_cost, transaction_date" },
        { status: 400 },
      );
    }

    // Calculate cost_per_gallon if not provided
    const calculatedCostPerGallon = cost_per_gallon || (total_cost / gallons);

    const { data, error } = await supabase
      .from("fuel_purchases")
      .insert({
        organization_id,
        transaction_id: transaction_id || `fuel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        card_number: card_number || null,
        driver_id: driver_id || null,
        truck_id: truck_id || null,
        location,
        gallons: Number(gallons),
        cost_per_gallon: calculatedCostPerGallon,
        total_cost: Number(total_cost),
        fuel_type: fuel_type || "Diesel",
        transaction_date,
        odometer: odometer || null,
        provider: provider || "manual",
        source: source || "manual",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      purchase: data,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Fuel purchase create error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create fuel purchase" },
      { status: 500 },
    );
  }
}
