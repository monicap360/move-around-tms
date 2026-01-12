import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/payroll/approve
// Expects: { weekStart: string, driver_id?: string, organization_id: string }
export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const weekStart = body.weekStart;
    const driver_id = body.driver_id;
    const organization_id = body.organization_id;

    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: "Missing weekStart" },
        { status: 400 },
      );
    }

    if (!organization_id) {
      return NextResponse.json(
        { success: false, error: "organization_id is required" },
        { status: 400 },
      );
    }

    // Verify organization exists
    const { data: org, error: orgError } = await supabase
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

    // Update payroll summary status for the week (optionally for a driver)
    // Filter by organization_id if column exists (graceful fallback if column doesn't exist)
    let updateQuery = supabase
      .from("driver_weekly_payroll_summary")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("week_start_friday", weekStart);
    
    // Try to add organization filter (will fail gracefully if column doesn't exist)
    // First check if we can query with organization_id
    const { error: testError } = await supabase
      .from("driver_weekly_payroll_summary")
      .select("organization_id")
      .limit(1);
    
    // If no error, column exists, so add the filter
    if (!testError) {
      updateQuery = updateQuery.eq("organization_id", organization_id);
    }
    
    if (driver_id) updateQuery = updateQuery.eq("driver_id", driver_id);
    const { error: summaryError } = await updateQuery;

    if (summaryError) {
      return NextResponse.json(
        { success: false, error: summaryError.message },
        { status: 500 },
      );
    }

    // Optionally, update all tickets for the week/driver as approved
    let ticketQuery = supabase
      .from("tickets")
      .update({ payroll_status: "approved" })
      .eq("pay_day", weekStart)
      .eq("organization_id", organization_id);
    if (driver_id) ticketQuery = ticketQuery.eq("driver_id", driver_id);
    const { error: ticketError } = await ticketQuery;

    if (ticketError) {
      return NextResponse.json(
        { success: false, error: ticketError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "unexpected" },
      { status: 500 },
    );
  }
}
