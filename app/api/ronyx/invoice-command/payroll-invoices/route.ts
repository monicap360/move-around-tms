import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("payroll_invoices")
      .select("id, payroll_invoice_number, contractor_name, driver_name, truck_number, payroll_week_start, payroll_week_end, status, ticket_total, deduction_total, total_paid")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error && (error.message.includes("does not exist") || error.message.includes("relation"))) {
      return NextResponse.json({ invoices: [] });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ invoices: data || [] });
  } catch {
    return NextResponse.json({ invoices: [] });
  }
}
