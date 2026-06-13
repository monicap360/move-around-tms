import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  if (!body.job_id || !body.rule_overridden || !body.reason || !body.manager_name) {
    return NextResponse.json({ error: "job_id, rule_overridden, reason, and manager_name are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dispatch_overrides")
    .insert({
      job_id:          body.job_id,
      driver_id:       body.driver_id       || null,
      rule_overridden: body.rule_overridden,
      reason:          body.reason,
      manager_name:    body.manager_name,
      approved:        body.approved        ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write audit entry
  await supabase.from("trip_status_history").insert({
    job_id:      body.job_id,
    from_status: null,
    to_status:   "override_logged",
    changed_by:  body.manager_name,
    note:        `Override: ${body.rule_overridden} — ${body.reason}`,
  });

  return NextResponse.json({ override: data }, { status: 201 });
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");

  let query = supabase
    .from("dispatch_overrides")
    .select("*")
    .order("created_at", { ascending: false });

  if (jobId) query = query.eq("job_id", jobId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ overrides: [], error: error.message });
  return NextResponse.json({ overrides: data || [] });
}
