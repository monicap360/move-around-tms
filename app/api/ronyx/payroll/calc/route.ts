import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PayRule = {
  driver_id: string;
  pay_type: string;
  pay_rate: number;
};

function computeGross(payType: string, payRate: number, tickets: any[]) {
  if (payType === "per_load") {
    return tickets.length * payRate;
  }
  if (payType === "per_hour") {
    const hours = tickets.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
    return hours * payRate;
  }
  const quantity = tickets.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
  return quantity * payRate;
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json();
  const { start_date, end_date, driver_id } = body || {};

  if (!start_date || !end_date) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
  }

  const { data: tickets, error: ticketError } = await supabase
    .from("aggregate_tickets")
    .select("*")
    .gte("ticket_date", start_date)
    .lte("ticket_date", end_date)
    .in("status", ["approved", "invoiced", "paid"]);

  if (ticketError) {
    return NextResponse.json({ error: ticketError.message }, { status: 500 });
  }

  const { data: drivers } = await supabase.from("drivers").select("id, name, full_name");
  const { data: rules } = await supabase.from("ronyx_payroll_rules").select("*");
  const { data: deductions } = await supabase.from("ronyx_driver_deductions").select("*").eq("is_active", true);

  const driverMap = new Map((drivers || []).map((d) => [d.id, d]));
  const rulesMap = new Map((rules || []).map((r: PayRule) => [r.driver_id, r]));
  const deductionsByDriver = new Map<string, number>();
  (deductions || []).forEach((ded) => {
    const current = deductionsByDriver.get(ded.driver_id) || 0;
    deductionsByDriver.set(ded.driver_id, current + Number(ded.amount || 0));
  });

  const byDriver = new Map<string, any[]>();
  (tickets || []).forEach((ticket) => {
    const id = ticket.driver_id || ticket.driver_name;
    if (!id) return;
    const key = ticket.driver_id || ticket.driver_name;
    if (!byDriver.has(key)) byDriver.set(key, []);
    byDriver.get(key)?.push(ticket);
  });

  const results = [];
  for (const [key, items] of byDriver.entries()) {
    if (driver_id && key !== driver_id && key !== driver_id) continue;
    const driver = driverMap.get(key) || (drivers || []).find((d) => d.name === key || d.full_name === key);
    const rule = driver ? rulesMap.get(driver.id) : null;
    const payType = rule?.pay_type || "per_ton";
    const payRate = Number(rule?.pay_rate ?? items[0]?.pay_rate ?? 0);
    const gross = computeGross(payType, payRate, items);
    const deductionsTotal = deductionsByDriver.get(driver?.id || key) || 0;
    const net = gross - deductionsTotal;
    results.push({
      driver_id: driver?.id || null,
      driver_name: driver?.name || driver?.full_name || key,
      pay_type: payType,
      pay_rate: payRate,
      gross_pay: gross,
      deductions: deductionsTotal,
      net_pay: net,
      ticket_ids: items.map((t) => t.id),
      tickets: items,
    });
  }

  return NextResponse.json({ results });
}
