import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const category = searchParams.get("category");
  const driverId = searchParams.get("driver_id");
  const jobId    = searchParams.get("job_id");
  const source   = searchParams.get("source");

  let query = supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status)   query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (driverId) query = query.eq("related_driver_id", driverId);
  if (jobId)    query = query.eq("related_job_id", jobId);
  if (source)   query = query.eq("source", source);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data || [] });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  if (!body.title || !body.category) {
    return NextResponse.json({ error: "title and category are required" }, { status: 400 });
  }

  const { data: ticket, error: tErr } = await supabase
    .from("tickets")
    .insert({
      title:                   body.title,
      description:             body.description || null,
      category:                body.category,
      status:                  body.status || "new",
      priority:                body.priority || "medium",
      source:                  body.source || "manual",
      impact:                  body.impact || [],
      related_job_id:          body.related_job_id || null,
      related_driver_id:       body.related_driver_id || null,
      related_vehicle_id:      body.related_vehicle_id || null,
      related_wo_id:           body.related_wo_id || null,
      fast_scan_id:            body.fast_scan_id || null,
      scan_type:               body.scan_type || null,
      payroll_impact:          body.payroll_impact || false,
      payroll_status:          body.payroll_status || "none",
      payroll_hold_reason:     body.payroll_hold_reason || null,
      estimated_driver_pay:    body.estimated_driver_pay || null,
      assigned_to:             body.assigned_to || null,
      due_date:                body.due_date || null,
      created_by:              body.created_by || "system",
    })
    .select()
    .single();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Auto-create payroll item if this ticket has payroll impact
  if (body.payroll_impact && body.related_driver_id && body.payroll_action) {
    const { data: piData } = await supabase
      .from("payroll_items")
      .insert({
        driver_id:         body.related_driver_id,
        driver_name:       body.driver_name || null,
        related_job_id:    body.related_job_id || null,
        job_number:        body.job_number || null,
        item_type:         body.payroll_item_type || "trip_pay",
        description:       body.title,
        gross_amount:      body.estimated_driver_pay || 0,
        status:            body.payroll_action === "hold" ? "hold" : "pending",
        hold_reason:       body.payroll_hold_reason || null,
        source:            body.source || "manual",
        related_ticket_id: ticket?.id,
        created_by:        body.created_by || "system",
      })
      .select()
      .single();

    if (piData && ticket) {
      await supabase.from("tickets").update({ related_payroll_item_id: piData.id }).eq("id", ticket.id);
      if (body.payroll_action === "hold") {
        await supabase.from("payroll_holds").insert({
          payroll_item_id: piData.id,
          hold_reason:     body.payroll_hold_reason || "Ticket pending review",
          hold_type:       body.payroll_hold_type || "manager_review",
          held_by:         body.created_by || "system",
        });
      }
    }
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
