import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    let query = supabaseAdmin.from("load_requests").select(`
        *,
        tracking_updates (
          id,
          timestamp,
          status,
          location,
          notes,
          created_at
        )
      `);

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching load requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch load requests" },
        { status: 500 },
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "customerId",
      "origin",
      "destination",
      "pickupDate",
      "commodity",
      "weight",
      "equipment",
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 },
        );
      }
    }

    const loadRequest = {
      customer_id: body.customerId,
      status: "pending",
      origin_address: body.origin.address,
      origin_city: body.origin.city,
      origin_state: body.origin.state,
      origin_zip_code: body.origin.zipCode,
      destination_address: body.destination.address,
      destination_city: body.destination.city,
      destination_state: body.destination.state,
      destination_zip_code: body.destination.zipCode,
      pickup_date: body.pickupDate,
      delivery_date: body.deliveryDate,
      commodity: body.commodity,
      weight: body.weight,
      equipment_type: body.equipment,
      special_requirements: body.specialRequirements,
      estimated_rate: body.estimatedRate,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("load_requests")
      .insert([loadRequest])
      .select()
      .single();

    if (error) {
      console.error("Error creating load request:", error);
      return NextResponse.json(
        { error: "Failed to create load request" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
