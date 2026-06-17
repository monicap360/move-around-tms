import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("invoice_ticket_rows")
      .select("id, contractor_name, truck_number, ticket_date, ticket_number, job_name, job_description, qty, haul_rate, full_rate, ticket_value, void_status, job_number, notes, lewis_percent, contractor_percent, c_truck_total, payout_rate, payout, customer_invoice_status, payroll_invoice_status, reconciliation_status")
      .order("ticket_date", { ascending: false })
      .limit(1000);

    if (error && (error.message.includes("does not exist") || error.message.includes("relation"))) {
      return NextResponse.json({ rows: [] });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data || [] });
  } catch {
    return NextResponse.json({ rows: [] });
  }
}
