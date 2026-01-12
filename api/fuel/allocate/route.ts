import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/fuel/allocate
// Allocate fuel costs to loads, trucks, or drivers
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { organization_id, fuel_purchase_id, allocation_type, target_id, target_type } = body;
    // allocation_type: 'load' | 'truck' | 'driver'
    // target_type: 'load' | 'truck' | 'driver'
    // target_id: load_id, truck_id, or driver_id

    if (!organization_id || !fuel_purchase_id || !allocation_type || !target_id || !target_type) {
      return NextResponse.json(
        { error: "Missing required fields: organization_id, fuel_purchase_id, allocation_type, target_id, target_type" },
        { status: 400 },
      );
    }

    // Validate allocation type
    if (!['load', 'truck', 'driver'].includes(allocation_type)) {
      return NextResponse.json(
        { error: "Invalid allocation_type. Must be: load, truck, or driver" },
        { status: 400 },
      );
    }

    // Get fuel purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from("fuel_purchases")
      .select("*")
      .eq("id", fuel_purchase_id)
      .eq("organization_id", organization_id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: "Fuel purchase not found" },
        { status: 404 },
      );
    }

    // Create allocation record
    const { data: allocation, error: allocationError } = await supabase
      .from("fuel_allocations")
      .insert({
        organization_id,
        fuel_purchase_id,
        allocation_type,
        target_id,
        target_type,
        gallons: purchase.gallons,
        cost_per_gallon: purchase.cost_per_gallon,
        total_cost: purchase.total_cost,
        allocated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (allocationError) {
      return NextResponse.json(
        { error: allocationError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      allocation,
    }, { status: 201 });
  } catch (err: any) {
    console.error("Fuel allocation error:", err);
    return NextResponse.json(
      { error: err.message || "Fuel allocation failed" },
      { status: 500 },
    );
  }
}

// GET /api/fuel/allocate
// Get fuel allocations for loads, trucks, or drivers
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const { searchParams } = new URL(req.url);
    const organization_id = searchParams.get("organization_id");
    const target_type = searchParams.get("target_type");
    const target_id = searchParams.get("target_id");

    if (!organization_id) {
      return NextResponse.json(
        { error: "Missing organization_id parameter" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("fuel_allocations")
      .select(`
        *,
        fuel_purchases (*)
      `)
      .eq("organization_id", organization_id)
      .order("allocated_at", { ascending: false });

    if (target_type) {
      query = query.eq("target_type", target_type);
    }
    if (target_id) {
      query = query.eq("target_id", target_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      allocations: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    console.error("Fuel allocations fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch fuel allocations" },
      { status: 500 },
    );
  }
}
