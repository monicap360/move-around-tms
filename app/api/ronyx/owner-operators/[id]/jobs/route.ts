import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_oo_jobs")
    .insert({
      oo_id:             params.id,
      project_name:      body.project_name      || null,
      project_number:    body.project_number    || null,
      load_date:         body.load_date         || null,
      truck_number:      body.truck_number      || null,
      driver_name:       body.driver_name       || null,
      origin:            body.origin            || null,
      destination:       body.destination       || null,
      material:          body.material          || null,
      tons:              body.tons              ? Number(body.tons)          : null,
      gross_revenue:     body.gross_revenue     ? Number(body.gross_revenue) : null,
      oo_rate:           body.oo_rate           ? Number(body.oo_rate)       : null,
      margin:            body.margin            ? Number(body.margin)        : null,
      ticket_status:     body.ticket_status     || "Verified",
      settlement_status: body.settlement_status || "Pending",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();
  const { job_id, ...rest } = body;

  const { data, error } = await sb
    .from("ronyx_oo_jobs")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", job_id)
    .eq("oo_id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data });
}
