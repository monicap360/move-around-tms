import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req) {
  const { driver_id, start_date, end_date } = await req.json();

  const { data, error } = await client
    .from("tickets")
    .select("*")
    .eq("driver_id", driver_id)
    .gte("created_at", start_date)
    .lte("created_at", end_date);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total_pay = data.reduce((sum, t) => sum + (t.pay ?? 0), 0);

  return NextResponse.json({ total_pay, tickets: data });
}
