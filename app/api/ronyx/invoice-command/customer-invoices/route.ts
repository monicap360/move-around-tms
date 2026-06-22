import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase
      .from("customer_invoices")
      .select("id, invoice_number, customer_name, job_number, invoice_date, invoice_status, ar_status, ticket_count, invoice_total")
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
