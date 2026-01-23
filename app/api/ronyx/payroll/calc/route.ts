import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PayRule = {
  driver_id: string;
  pay_type: string;
  pay_rate: number;
};

function isMonthlyParking(description?: string | null) {
  if (!description) return false;
  return description.toLowerCase().startsWith("truck parking:");
}

function monthCountInRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 1;
  const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
  const endMonth = endDate.getFullYear() * 12 + endDate.getMonth();
  return Math.max(1, endMonth - startMonth + 1);
}

function computeGross(payType: string, payRate: number, tickets: any[]) {
  if (payType === "per_load") {
    return tickets.length * payRate;
  }
  if (payType === "per_hour" || payType === "hourly") {
    const hours = tickets.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
    return hours * payRate;
  }
  if (payType === "per_yard") {
    const yards = tickets.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
    return yards * payRate;
  }
  if (payType === "percentage") {
    const revenue = tickets.reduce((sum, t) => {
      const qty = Number(t.quantity || 0);
      const rate = Number(t.bill_rate || t.rate_amount || 0);
      return sum + qty * rate;
    }, 0);
    return revenue * (payRate / 100);
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
  const monthsInPeriod = monthCountInRange(start_date, end_date);
  (deductions || []).forEach((ded) => {
    const current = deductionsByDriver.get(ded.driver_id) || 0;
    const amount = Number(ded.amount || 0);
    const total = isMonthlyParking(ded.description) ? amount * monthsInPeriod : amount;
    deductionsByDriver.set(ded.driver_id, current + total);
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
