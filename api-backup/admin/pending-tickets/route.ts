import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/admin/pending-tickets
// List all pending aggregate tickets for manager review
// Requires admin token for authorization

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized" },
    { status: 401 },
  );
}

export async function GET(req: NextRequest) {
  // Verify admin token
  const authHeader = req.headers.get("authorization") || "";
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken) {
    console.warn("ADMIN_TOKEN not set");
    return unauthorized();
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return unauthorized();
  }

  try {
    // Get all pending tickets with driver and partner info
    const { data: tickets, error } = await supabaseAdmin
      .from("aggregate_tickets")
      .select(
        `
        *,
        drivers:driver_id (id, name, pay_type, tax_status),
        aggregate_partners:partner_id (id, name, logo_url)
      `,
      )
      .eq("status", "Pending Manager Review")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch pending tickets", error);
      return NextResponse.json(
        { ok: false, message: "Failed to fetch tickets" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, tickets });
  } catch (error: any) {
    console.error("Unexpected error fetching pending tickets", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
