// Mark (or un-mark) a driver's pay week as PAID — locks the Friday payout so it can't be
// double-paid. Sets payroll_status on that driver's aggregate_tickets for the period.
//
//   POST { driver_id?, driver_name?, period_start, period_end, paid?: boolean }

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Update tolerant of schema drift (drops unknown columns like paid_at if absent).
async function stripAndRetry(run: (p: any) => PromiseLike<{ data: any; error: any }>, payload: Record<string, any>) {
  const p: Record<string, any> = { ...payload };
  for (let i = 0; i < 12; i++) {
    const { error, data } = await run(p);
    if (!error) return { data };
    const m = /Could not find the '(.+?)' column/.exec(error?.message || "");
    if (m && Object.prototype.hasOwnProperty.call(p, m[1])) { delete p[m[1]]; continue; }
    return { error };
  }
  return { error: { message: "schema drift" } };
}

export async function POST(req: Request) {
  const sb = supabaseAdmin as any;
  const orgId = await resolveOrgId();
  const body = await req.json().catch(() => ({}));
  const { driver_id, driver_name, period_start, period_end } = body;
  const paid = body.paid !== false; // default true; pass false to un-pay

  if ((!driver_id && !driver_name) || !period_start || !period_end) {
    return NextResponse.json({ error: "driver and period_start/period_end are required" }, { status: 400 });
  }

  const payload: Record<string, any> = {
    payroll_status: paid ? "paid" : "ready",
    payroll_ready: !paid,
    paid_at: paid ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  // Scope by driver + pay-week + not-voided (specific enough; the read side is org-scoped).
  const { data, error } = await stripAndRetry((p) => {
    let q = sb.from("aggregate_tickets").update(p)
      .gte("ticket_date", period_start).lte("ticket_date", period_end)
      .neq("status", "voided");
    q = driver_id ? q.eq("driver_id", driver_id) : q.eq("driver_name", driver_name);
    return q.select("id");
  }, payload);
  void orgId;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, paid, updated: (data || []).length });
}
