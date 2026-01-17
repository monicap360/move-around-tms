import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_payroll_runs").select("*").order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ runs: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { period_start, period_end, items } = body || {};

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "period_start and period_end required" }, { status: 400 });
  }

  const { data: run, error: runError } = await supabase
    .from("ronyx_payroll_runs")
    .insert({
      period_start,
      period_end,
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message || "Failed to create run" }, { status: 500 });
  }

  if (Array.isArray(items) && items.length > 0) {
    const payload = items.map((item) => ({
      run_id: run.id,
      driver_id: item.driver_id,
      driver_name: item.driver_name,
      gross_pay: item.gross_pay,
      deductions: item.deductions,
      net_pay: item.net_pay,
      ticket_ids: item.ticket_ids || [],
      details: item.details || {},
    }));
    await supabase.from("ronyx_payroll_items").insert(payload);
  }

  return NextResponse.json({ run });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { id, status } = body || {};
  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("ronyx_payroll_runs")
    .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ run: data });
}
