import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* GET — list maintenance events, optionally filtered */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const oo_id  = searchParams.get("oo_id");
  const status = searchParams.get("status") || "open";

  const sb = createSupabaseServerClient();
  let query = sb
    .from("ronyx_maintenance_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (oo_id)  query = query.eq("oo_id", oo_id);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data || [] });
}

/* POST — create a maintenance event (e.g., breakdown, mark out of service) */
export async function POST(req: Request) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  if (!body.event_type || !body.issue_title) {
    return NextResponse.json({ error: "event_type and issue_title required" }, { status: 400 });
  }

  const out_of_service = body.out_of_service === true ||
    ["breakdown","out_of_service","inspection_failed"].includes(body.event_type);

  const { data, error } = await sb
    .from("ronyx_maintenance_events")
    .insert({
      oo_id:               body.oo_id || null,
      truck_id:            body.truck_id || null,
      truck_number:        body.truck_number || null,
      oo_company_name:     body.oo_company_name || null,
      event_type:          body.event_type,
      severity:            body.severity || "medium",
      issue_title:         body.issue_title,
      issue_description:   body.issue_description || null,
      status:              "open",
      out_of_service:      out_of_service,
      out_of_service_at:   out_of_service ? new Date().toISOString() : null,
      estimated_return_at: body.estimated_return_at || null,
      reported_by:         body.reported_by || null,
      notes:               body.notes || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If truck is marked out of service, update truck status in oo_trucks
  if (out_of_service && body.truck_id) {
    await sb
      .from("ronyx_oo_trucks")
      .update({ status: body.event_type === "breakdown" ? "out_of_service" : "in_maintenance" })
      .eq("id", body.truck_id);
  }

  return NextResponse.json({ event: data });
}
