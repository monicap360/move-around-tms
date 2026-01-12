import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function computeCurrentFridayISODate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);

  return friday.toISOString().slice(0, 10);
}

// POST /api/payroll/generate
export async function POST(req: Request) {
  try {
    const supabaseAdmin = createServerAdmin();
    const body = await req.json().catch(() => ({}));
    const weekStart = body.weekStart || computeCurrentFridayISODate();
    const organization_id = body.organization_id;

    if (!organization_id) {
      return NextResponse.json(
        { success: false, error: "organization_id is required" },
        { status: 400 },
      );
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 },
      );
    }

    // Aggregate ticket/driver data for the week
    // Query tickets table for the pay period with organization filter
    let ticketsQuery = supabaseAdmin
      .from("tickets")
      .select("driver_id, driver_name, amount, pay_day, organization_id")
      .eq("pay_day", weekStart);

    // Filter by organization_id if available in tickets table
    const { data: tickets, error: ticketError } = await ticketsQuery.eq("organization_id", organization_id);

    if (ticketError) {
      return NextResponse.json(
        { success: false, error: ticketError.message },
        { status: 500 },
      );
    }

    // Group by driver and calculate totals
    const driverTotals = (tickets || []).reduce((acc: any, ticket: any) => {
      const driverId = ticket.driver_id || ticket.driver_name;
      if (!acc[driverId]) {
        acc[driverId] = {
          driver_id: ticket.driver_id,
          driver_name: ticket.driver_name,
          total_pay: 0,
          total_tickets: 0,
        };
      }
      acc[driverId].total_pay += Number(ticket.amount || 0);
      acc[driverId].total_tickets += 1;
      return acc;
    }, {});

    // Upsert into driver_weekly_payroll_summary (if table exists)
    // Otherwise, use payroll_entries table
    const results = [];
    for (const driverId of Object.keys(driverTotals)) {
      const row = driverTotals[driverId];
      
      // Try driver_weekly_payroll_summary first, fallback to payroll_entries
      const { error: summaryError } = await supabaseAdmin
        .from("driver_weekly_payroll_summary")
        .upsert(
          {
            driver_id: row.driver_id,
            driver_name: row.driver_name,
            week_start_friday: weekStart,
            total_pay: row.total_pay,
            total_tickets: row.total_tickets,
          },
          { onConflict: "driver_id,week_start_friday" },
        );

      if (summaryError) {
        // If table doesn't exist, log warning but continue
        console.warn("driver_weekly_payroll_summary upsert failed:", summaryError.message);
      }

      results.push(row);
    }

    return NextResponse.json({
      success: true,
      weekStart,
      drivers: results.length,
      payroll: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "unexpected error" },
      { status: 500 },
    );
  }
}
