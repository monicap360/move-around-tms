import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date_from = searchParams.get("date_from");
  const date_to   = searchParams.get("date_to");
  const status    = searchParams.get("status");
  const view      = searchParams.get("view") ?? "summary";

  const supabase = createSupabaseServerClient();

  if (view === "summary") {
    // KPI summary — parallel fetch
    const [loadsRes, exceptionsRes, recoveryRes, ticketsRes] = await Promise.all([
      supabase.from("accuriscale_loads").select("id, billing_status, payroll_status, actual_tons, expected_tons, customer_rate"),
      supabase.from("accuriscale_exceptions").select("id, exception_type, severity, status"),
      supabase.from("accuriscale_revenue_recovery").select("amount_recovered, recovery_type, status"),
      supabase.from("accuriscale_scale_tickets").select("id, ocr_status, is_duplicate"),
    ]);

    const loads     = loadsRes.data     ?? [];
    const exc       = exceptionsRes.data ?? [];
    const recovery  = recoveryRes.data  ?? [];
    const tickets   = ticketsRes.data   ?? [];

    const totalLoads         = loads.length;
    const cleanLoads         = loads.filter(l => l.billing_status === "ready_to_bill" && l.payroll_status === "ready_for_payroll").length;
    const billingHolds       = loads.filter(l => l.billing_status === "billing_hold").length;
    const payrollHolds       = loads.filter(l => l.payroll_status === "payroll_hold").length;
    const openExceptions     = exc.filter(e => e.status === "open" || e.status === "in_review").length;
    const criticalExceptions = exc.filter(e => e.severity === "critical" && (e.status === "open" || e.status === "in_review")).length;
    const totalTickets       = tickets.length;
    const duplicateTickets   = tickets.filter(t => t.is_duplicate).length;
    const totalRecovered     = recovery.filter(r => r.status !== "waived").reduce((sum, r) => sum + Number(r.amount_recovered), 0);

    return NextResponse.json({
      summary: {
        totalLoads, cleanLoads, billingHolds, payrollHolds,
        openExceptions, criticalExceptions,
        totalTickets, duplicateTickets,
        totalRecoveredDollars: totalRecovered,
      },
    });
  }

  if (view === "exceptions") {
    let q = supabase
      .from("accuriscale_exceptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (status)   q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ exceptions: [], error: error.message });
    return NextResponse.json({ exceptions: data ?? [] });
  }

  if (view === "loads") {
    let q = supabase
      .from("accuriscale_loads")
      .select("*")
      .order("load_date", { ascending: false })
      .limit(200);
    if (date_from) q = q.gte("load_date", date_from);
    if (date_to)   q = q.lte("load_date", date_to);
    if (status)    q = q.eq("billing_status", status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ loads: [], error: error.message });
    return NextResponse.json({ loads: data ?? [] });
  }

  if (view === "tickets") {
    let q = supabase
      .from("accuriscale_scale_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (date_from) q = q.gte("ticket_date", date_from);
    if (date_to)   q = q.lte("ticket_date", date_to);
    const { data, error } = await q;
    if (error) return NextResponse.json({ tickets: [], error: error.message });
    return NextResponse.json({ tickets: data ?? [] });
  }

  if (view === "recovery") {
    const { data, error } = await supabase
      .from("accuriscale_revenue_recovery")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ recovery: [], error: error.message });
    return NextResponse.json({ recovery: data ?? [] });
  }

  if (view === "roi") {
    const { data } = await supabase
      .from("accuriscale_roi_settings")
      .select("*")
      .single();
    return NextResponse.json({ roi_settings: data ?? null });
  }

  return NextResponse.json({ error: "Unknown view" }, { status: 400 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { action, ...payload } = body;
  const supabase = createSupabaseServerClient();

  if (action === "resolve_exception") {
    const { exception_id, resolution_notes, resolved_by } = payload;
    const { data, error } = await supabase
      .from("accuriscale_exceptions")
      .update({ status: "resolved", resolution_notes, resolved_by, resolved_at: new Date().toISOString() })
      .eq("id", exception_id)
      .select("id, status")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exception: data, message: "Exception resolved" });
  }

  if (action === "dismiss_exception") {
    const { exception_id, resolved_by } = payload;
    const { data, error } = await supabase
      .from("accuriscale_exceptions")
      .update({ status: "dismissed", resolved_by, resolved_at: new Date().toISOString() })
      .eq("id", exception_id)
      .select("id, status")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exception: data });
  }

  if (action === "release_load") {
    const { load_id, release_billing = true, release_payroll = true } = payload;
    const updates: Record<string, string> = {};
    if (release_billing)  updates.billing_status  = "ready_to_bill";
    if (release_payroll)  updates.payroll_status   = "ready_for_payroll";
    const { data, error } = await supabase
      .from("accuriscale_loads")
      .update(updates)
      .eq("id", load_id)
      .select("id, billing_status, payroll_status")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ load: data, message: "Load released" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
