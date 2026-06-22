import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set([
  "customer_no_show","driver_late","vehicle_issue","wrong_address",
  "payment_issue","passenger_complaint","damage_report","accident",
  "weather_delay","cruise_delay","airport_delay","other",
]);

export async function POST(req: Request) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  if (!body.incident_type || !VALID_TYPES.has(body.incident_type)) {
    return NextResponse.json({ error: "Valid incident_type is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dispatch_incidents")
    .insert({
      job_id:         body.job_id        || null,
      driver_id:      body.driver_id     || null,
      incident_type:  body.incident_type,
      description:    body.description   || null,
      severity:       body.severity      || "medium",
      created_by:     body.created_by    || "dispatch",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  if (body.job_id) {
    await supabase.from("trip_status_history").insert({
      job_id:      body.job_id,
      from_status: null,
      to_status:   "incident_logged",
      changed_by:  body.created_by || "dispatch",
      note:        `Incident: ${body.incident_type}${body.description ? " — " + body.description : ""}`,
    });
  }

  return NextResponse.json({ incident: data }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const jobId   = searchParams.get("job_id");
  const open    = searchParams.get("open"); // "true" = unresolved only

  let query = supabase
    .from("dispatch_incidents")
    .select("*")
    .order("created_at", { ascending: false });

  if (jobId) query = query.eq("job_id", jobId);
  if (open === "true") query = query.eq("is_resolved", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ incidents: [], error: error.message });
  return NextResponse.json({ incidents: data || [] });
}

export async function PATCH(req: Request) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("dispatch_incidents")
    .update({
      is_resolved: true,
      resolved_by: body.resolved_by || "dispatch",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data });
}
