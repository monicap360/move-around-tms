import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkGeofencesInternal } from "@/app/api/geofencing/integration/route";

export const dynamic = "force-dynamic";

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function authenticateApiKey(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  apiKey: string,
) {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, revoked_at")
    .eq("key_hash", hashKey(apiKey))
    .single();

  if (error || !data || data.revoked_at) {
    return null;
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.organization_id as string;
}

async function updateDetentionFromGeofence(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  organizationId: string,
  geofenceId: string,
  eventType: "entry" | "exit",
  timestamp: string,
  driverId?: string,
  truckId?: string,
) {
  const { data: geofence } = await supabase
    .from("geofences")
    .select("id, name, rules")
    .eq("id", geofenceId)
    .single();

  if (!geofence?.rules?.detentionFacility) {
    return;
  }

  if (eventType === "entry") {
    await supabase.from("detention_events").insert({
      organization_id: organizationId,
      geofence_id: geofenceId,
      facility_name: geofence.name,
      arrived_at: timestamp,
      status: "open",
      source: "geofence",
      driver_id: driverId || null,
      truck_id: truckId || null,
    });
    return;
  }

  const { data: openEvent } = await supabase
    .from("detention_events")
    .select("id, arrived_at")
    .eq("organization_id", organizationId)
    .eq("geofence_id", geofenceId)
    .eq("status", "open")
    .order("arrived_at", { ascending: false })
    .limit(1)
    .single();

  if (!openEvent) {
    return;
  }

  const arrived = new Date(openEvent.arrived_at).getTime();
  const departed = new Date(timestamp).getTime();
  const totalMinutes =
    Number.isNaN(arrived) || Number.isNaN(departed) || departed <= arrived
      ? 0
      : Math.round((departed - arrived) / 60000);

  await supabase
    .from("detention_events")
    .update({
      departed_at: timestamp,
      total_minutes: totalMinutes,
      status: "closed",
    })
    .eq("id", openEvent.id);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key") || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    const organizationId = await authenticateApiKey(supabase, apiKey);
    if (!organizationId) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await req.json();
    const {
      provider,
      device_id,
      driver_id,
      truck_id,
      latitude,
      longitude,
      status,
      timestamp,
      speed,
      heading,
      load_reference,
    } = body;

    if (!provider || !device_id || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "provider, device_id, latitude, longitude are required" },
        { status: 400 },
      );
    }

    const pingTime = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const { data: previous } = await supabase
      .from("eld_device_status")
      .select("last_lat, last_lng")
      .eq("organization_id", organizationId)
      .eq("provider", provider)
      .eq("device_id", device_id)
      .single();

    const previousLocation =
      previous?.last_lat != null && previous?.last_lng != null
        ? { lat: Number(previous.last_lat), lng: Number(previous.last_lng) }
        : null;

    const location = { lat: Number(latitude), lng: Number(longitude) };

    await supabase.from("eld_device_status").upsert(
      {
        organization_id: organizationId,
        provider,
        device_id,
        driver_id: driver_id || null,
        truck_id: truck_id || null,
        last_lat: location.lat,
        last_lng: location.lng,
        last_status: status || null,
        last_timestamp: pingTime,
      },
      { onConflict: "organization_id,provider,device_id" },
    );

    await supabase.from("tracking_updates").insert({
      organization_id: organizationId,
      status: status || "ELD Ping",
      location: load_reference || null,
      latitude: location.lat,
      longitude: location.lng,
      notes: provider,
    });

    const geofenceResult = await checkGeofencesInternal(
      location,
      previousLocation,
      organizationId,
      truck_id || undefined,
      driver_id || undefined,
      truck_id || undefined,
      speed,
      heading,
    );

    if (geofenceResult.events?.length) {
      for (const event of geofenceResult.events) {
        if (event.eventType === "entry" || event.eventType === "exit") {
          await updateDetentionFromGeofence(
            supabase,
            organizationId,
            event.geofenceId,
            event.eventType,
            event.timestamp,
            driver_id,
            truck_id,
          );
        }
      }
    }

    await supabase
      .from("integration_connections")
      .upsert(
        {
          organization_id: organizationId,
          provider,
          status: "connected",
          last_synced_at: new Date().toISOString(),
          metadata: { last_device_id: device_id },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,provider" },
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ELD ping error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
