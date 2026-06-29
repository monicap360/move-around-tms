// Payroll source of truth = aggregate_tickets ("the agg portion").
// Reads tickets for a period, groups by driver, sums load amounts, and includes the
// truck each ticket ran on. This is the read side of driver payroll.
//
//   GET /api/ronyx/payroll/from-tickets?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD[&driver_id=]
//   → { period, drivers: [{ driver_id, driver_name, trucks[], ticket_count, total_loads,
//        total_pay, total_bill, tickets:[{ticket_number,ticket_date,truck_number,material,
//        quantity,rate,amount}] }], unassigned }

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export async function GET(req: Request) {
  const sb = supabaseAdmin as any;
  const orgId = await resolveOrgId();
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("period_start");
  const end = searchParams.get("period_end");
  const driverId = searchParams.get("driver_id");

  let q = sb.from("aggregate_tickets").select("*");
  if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
  if (start) q = q.gte("ticket_date", start);
  if (end) q = q.lte("ticket_date", end);
  if (driverId) q = q.eq("driver_id", driverId);
  // Exclude voided/missing tickets from pay.
  q = q.neq("status", "voided");

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).filter((t: any) => !t.voided && !t.is_missing_ticket);

  // Per-ticket pay amount, robust to which column is populated.
  const ticketAmount = (t: any) => {
    if (t.total_pay != null) return num(t.total_pay);
    const qty = num(t.quantity || t.load_count || t.cubic_yards);
    const rate = num(t.pay_rate || t.rate);
    if (qty && rate) return qty * rate;
    return num(t.total_amount || t.amount || t.gross_amount);
  };
  const ticketBill = (t: any) => {
    if (t.total_bill != null) return num(t.total_bill);
    const qty = num(t.quantity || t.load_count || t.cubic_yards);
    const rate = num(t.bill_rate || t.rate);
    return qty && rate ? qty * rate : num(t.total_amount || t.amount);
  };

  const groups: Record<string, any> = {};
  const unassigned: any[] = [];
  for (const t of rows) {
    const driver = (t.driver_name || "").trim();
    const key = t.driver_id || driver || "";
    const slim = {
      ticket_number: t.ticket_number || t.weight_ticket_number || null,
      ticket_date: t.ticket_date || null,
      truck_number: t.truck_number || t.truck_id || null,
      material: t.material || null,
      quantity: num(t.quantity || t.load_count || t.cubic_yards),
      rate: num(t.pay_rate || t.rate),
      amount: ticketAmount(t),
      bill: ticketBill(t),
    };
    if (!key) { unassigned.push(slim); continue; }
    const g = groups[key] || (groups[key] = {
      driver_id: t.driver_id || null, driver_name: driver || "Unknown",
      trucks: new Set<string>(), ticket_count: 0, total_loads: 0, total_pay: 0, total_bill: 0, tickets: [] as any[],
    });
    if (slim.truck_number) g.trucks.add(String(slim.truck_number));
    g.ticket_count += 1;
    g.total_loads += slim.quantity;
    g.total_pay += slim.amount;
    g.total_bill += slim.bill;
    g.tickets.push(slim);
  }

  const drivers = Object.values(groups).map((g: any) => ({
    ...g,
    trucks: [...g.trucks],
    truck_number: [...g.trucks].join(", ") || "—", // for direct mapping into payroll items
    gross_pay: Math.round(g.total_pay * 100) / 100, // alias the page's mapper expects
    total_pay: Math.round(g.total_pay * 100) / 100,
    total_bill: Math.round(g.total_bill * 100) / 100,
  })).sort((a: any, b: any) => b.total_pay - a.total_pay);

  return NextResponse.json({
    period: { start, end },
    driver_count: drivers.length,
    ticket_count: rows.length,
    total_pay: Math.round(drivers.reduce((s: number, d: any) => s + d.total_pay, 0) * 100) / 100,
    drivers,
    unassigned,
  });
}
