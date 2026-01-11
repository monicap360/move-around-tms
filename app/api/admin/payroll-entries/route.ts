import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401 },
  );
}
function check(req: NextRequest) {
  const t = req.headers.get("authorization") || "";
  const e = process.env.ADMIN_TOKEN;
  return e && t === `Bearer ${e}`;
}

export async function GET(req: NextRequest) {
  if (!check(req)) return unauthorized();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const employeeId = url.searchParams.get("employee_id");
  let q = supabaseAdmin
    .from("payroll_entries")
    .select("*, employees(full_name)")
    .order("pay_period_end", { ascending: false });
  if (from) q = q.gte("pay_period_start", from);
  if (to) q = q.lte("pay_period_end", to);
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q;
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: NextRequest) {
  if (!check(req)) return unauthorized();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const {
    employee_id,
    pay_period_start,
    pay_period_end,
    total_hours,
    hourly_rate,
    percentage_rate,
    load_revenue,
    deductions,
    pay_type,
  } = body;
  const { data, error } = await supabaseAdmin
    .from("payroll_entries")
    .insert([
      {
        employee_id,
        pay_period_start,
        pay_period_end,
        total_hours,
        hourly_rate,
        percentage_rate,
        load_revenue,
        deductions,
        pay_type,
      },
    ])
    .select("*, employees(full_name)");
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, item: data?.[0] });
}

export async function PATCH(req: NextRequest) {
  if (!check(req)) return unauthorized();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const { id, ...updates } = body;
  if (!id)
    return NextResponse.json(
      { ok: false, error: "missing_id" },
      { status: 400 },
    );
  const { data, error } = await supabaseAdmin
    .from("payroll_entries")
    .update(updates)
    .eq("id", id)
    .select("*, employees(full_name)")
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, item: data });
}
