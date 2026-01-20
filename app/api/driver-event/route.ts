import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 },
      );
    }

    const timestamp = body.timestamp || new Date().toISOString();
    const driverName = body.driver_id || body.driver_name || null;
    const statusCode = body.status_code || body.event_type || null;
    const note = body.note || body.payload?.note || null;
    const loadId = body.load_id || null;
    const location = body.location || null;

    const { error: eventError } = await supabaseAdmin
      .from("ronyx_driver_events")
      .insert({
        event_type: body.event_type,
        driver_id: driverName,
        truck_id: body.truck_id || null,
        load_id: loadId,
        timestamp,
        status_code: statusCode,
        note,
        location,
        payload: body.payload || null,
      });

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    const { data: updateRow, error: updateError } = await supabaseAdmin
      .from("ronyx_driver_updates")
      .insert({
        driver_name: driverName,
        status: statusCode,
        notes: note,
        ticket_id: body.payload?.ticket_id || null,
        created_at: timestamp,
      })
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (loadId) {
      const statusMap: Record<string, string> = {
        AT_PIT: "at_pit",
        EN_ROUTE: "en_route",
        DELIVERING: "delivering",
        LOADING: "loading",
        ON_SITE: "on_site",
        TRUCK_DOWN: "truck_down",
        SITE_DELAY: "site_delay",
        PIT_CHECK_IN: "at_pit",
        DELIVERY_CONFIRMATION: "completed",
      };
      const mappedStatus =
        statusCode && statusMap[statusCode] ? statusMap[statusCode] : null;
      const loadUpdates: Record<string, any> = {
        updated_at: timestamp,
      };
      if (mappedStatus) {
        loadUpdates.status = mappedStatus;
      }
      if (note) {
        loadUpdates.status_notes = note;
      }
      if (body.payload?.pod_url) {
        loadUpdates.pod_url = body.payload.pod_url;
      }
      if (body.payload?.ticket_number) {
        loadUpdates.ticket_number = body.payload.ticket_number;
      }
      if (body.payload?.ticket_image_url) {
        loadUpdates.ticket_image_url = body.payload.ticket_image_url;
      }

      await supabaseAdmin
        .from("ronyx_loads")
        .update(loadUpdates)
        .eq("id", loadId);
    }

    return NextResponse.json({
      ok: true,
      received_at: timestamp,
      update: updateRow,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Invalid JSON" },
      { status: 400 },
    );
  }
}
