import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET/POST /api/aggregates
// Server-side endpoint for quotes/billing/profit calculations. Protected by a
// basic bearer-token guard (process.env.ADMIN_TOKEN). Replace with proper
// auth in production.

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("aggregate_quotes")
      .select(
        "id,company,billing_type,rate,pay_rate,total_profit,status,created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Aggregates fetch error:", err?.message || err);
    return NextResponse.json(
      { success: false, message: err?.message || "error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { company, billing_type, rate, pay_rate } = body;

    const profit = Number(rate) - Number(pay_rate);
    const { data, error } = await supabaseAdmin
      .from("aggregate_quotes")
      .insert([
        {
          company,
          billing_type,
          rate,
          pay_rate,
          total_profit: profit,
          status: "Pending",
        },
      ]);

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Aggregate create error:", err?.message || err);
    return NextResponse.json(
      { success: false, message: err?.message || "error" },
      { status: 500 },
    );
  }
}
