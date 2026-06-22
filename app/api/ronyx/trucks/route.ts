import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const orgId = process.env.RONYX_ORG_ID ?? null;

  let { data, error } = await supabase
    .from("ronyx_trucks")
    .select("*")
    .or(orgId ? `organization_id.eq.${orgId},organization_id.is.null` : `id.not.is.null`)
    .order("truck_number", { ascending: true });

  // Fallback: if organization_id column doesn't exist yet (migration 165 not run)
  if (error && (error.message.includes("organization_id") || error.code === "42703")) {
    ({ data, error } = await supabase
      .from("ronyx_trucks")
      .select("*")
      .order("truck_number", { ascending: true }));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trucks: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = supabaseAdmin;
  const orgId = process.env.RONYX_ORG_ID ?? null;

  const insertPayload = {
    organization_id: orgId,
    truck_number: payload.truck_number || null,
    make:         payload.make || null,
    model:        payload.model || null,
    year:         payload.year || null,
    vin:          payload.vin || null,
    status:       payload.status || "active",
    truck_type:   payload.type || null,
    plate:        payload.plate || null,
    odometer:     payload.odometer ? Number(payload.odometer) : null,
  };

  if (!insertPayload.truck_number) {
    return NextResponse.json({ error: "truck_number is required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("ronyx_trucks").insert(insertPayload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ truck: data });
}
