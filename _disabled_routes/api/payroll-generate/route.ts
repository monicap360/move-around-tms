import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

function computeCurrentFridayISODate(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const iso = ((day + 6) % 7) + 1;
  const daysToFriday = (5 - iso + 7) % 7;
  const friday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  friday.setUTCDate(friday.getUTCDate() + daysToFriday);
  return friday.toISOString().slice(0, 10);
}

// POST /api/payroll/generate
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const weekStart = body.weekStart || computeCurrentFridayISODate();

    // Aggregate ticket/driver data for the week
    // Example: sum tickets, pay, etc. from tickets table
    const { data: tickets, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select(
        "driver_id, driver_name, SUM(amount) as total_pay, COUNT(*) as tickets_count",
      )
      .eq("pay_day", weekStart)
      .group("driver_id, driver_name");

    if (ticketError) {
      return NextResponse.json(
        { success: false, error: ticketError.message },
        { status: 500 },
      );
    }

    // Upsert into driver_weekly_payroll_summary
    for (const row of tickets || []) {
      await supabaseAdmin.from("driver_weekly_payroll_summary").upsert(
        {
          driver_id: row.driver_id,
          driver_name: row.driver_name,
          week_start_friday: weekStart,
          total_pay: Number(row.total_pay) || 0,
          total_tickets: Number(row.tickets_count) || 0,
        },
        { onConflict: "driver_id,week_start_friday" },
      );
    }

    return NextResponse.json({
      success: true,
      weekStart,
      drivers: (tickets || []).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "unexpected" },
      { status: 500 },
    );
  }
}
