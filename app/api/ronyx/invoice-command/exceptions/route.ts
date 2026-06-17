import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("invoice_reconciliation_exceptions")
      .select("id, exception_type, severity, issue, dollar_impact, next_best_action, status, contractor_name, truck_number, ticket_number")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error && (error.message.includes("does not exist") || error.message.includes("relation"))) {
      return NextResponse.json({ exceptions: [] });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exceptions: data || [] });
  } catch {
    return NextResponse.json({ exceptions: [] });
  }
}
