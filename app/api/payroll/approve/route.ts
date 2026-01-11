import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// POST /api/payroll/approve
// Expects: { weekStart: string, driver_id?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const weekStart = body.weekStart;
    const driver_id = body.driver_id;
    if (!weekStart) {
      return NextResponse.json({ success: false, error: "Missing weekStart" }, { status: 400 });
    }

    // Update payroll summary status for the week (optionally for a driver)
    let updateQuery = supabaseAdmin
      .from("driver_weekly_payroll_summary")
      .update({ status: "approved" })
      .eq("week_start_friday", weekStart);
    if (driver_id) updateQuery = updateQuery.eq("driver_id", driver_id);
    const { error: summaryError } = await updateQuery;
    if (summaryError) {
      return NextResponse.json({ success: false, error: summaryError.message }, { status: 500 });
    }

    // Optionally, update all tickets for the week/driver as approved
    let ticketQuery = supabaseAdmin
      .from("tickets")
      .update({ payroll_status: "approved" })
      .eq("pay_day", weekStart);
    if (driver_id) ticketQuery = ticketQuery.eq("driver_id", driver_id);
    const { error: ticketError } = await ticketQuery;
    if (ticketError) {
      return NextResponse.json({ success: false, error: ticketError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "unexpected" }, { status: 500 });
  }
}
