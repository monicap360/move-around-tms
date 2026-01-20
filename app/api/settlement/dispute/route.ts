import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      driver_id,
      settlement_item_id,
      dispute_type,
      dispute_notes,
      driver_proposed_value,
    } = body || {};

    if (!driver_id || !settlement_item_id || !dispute_type) {
      return NextResponse.json(
        { error: "driver_id, settlement_item_id, and dispute_type are required" },
        { status: 400 },
      );
    }

    const { data: item, error } = await supabaseAdmin
      .from("driver_settlement_items")
      .update({
        status: "DISPUTED",
        dispute_type,
        dispute_notes: dispute_notes || null,
        driver_proposed_value: driver_proposed_value ?? null,
      })
      .eq("id", settlement_item_id)
      .eq("driver_id", driver_id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from("ronyx_driver_events").insert({
      event_type: "DISPUTE_FLAG",
      driver_id: String(driver_id),
      load_id: item.load_id,
      timestamp: new Date().toISOString(),
      status_code: "DISPUTED",
      note: dispute_notes || dispute_type,
      payload: {
        settlement_item_id,
        dispute_type,
        driver_proposed_value: driver_proposed_value ?? null,
      },
    });

    return NextResponse.json({ success: true, settlement_item: item });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Invalid request" },
      { status: 400 },
    );
  }
}
