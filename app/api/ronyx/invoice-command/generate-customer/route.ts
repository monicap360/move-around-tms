import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    // Pull approved tickets that haven't been invoiced yet
    const { data: tickets } = await supabase
      .from("aggregate_tickets")
      .select("id, ticket_number, customer_name, ticket_date, quantity, rate, billing_hold")
      .eq("status", "approved")
      .eq("billing_hold", false)
      .is("invoice_number", null)
      .limit(500);

    if (!tickets?.length) return NextResponse.json({ message: "No approved tickets ready for customer invoicing." });

    const byCustomer = tickets.reduce((acc, t) => {
      const key = t.customer_name || "Unknown Customer";
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {} as Record<string, typeof tickets>);

    let created = 0;
    for (const [customer, rows] of Object.entries(byCustomer)) {
      const total = rows.reduce((a, r) => a + ((r.quantity || 0) * (r.rate || 0)), 0);
      await supabase.from("customer_invoices").insert({
        customer_name:  customer,
        invoice_date:   new Date().toISOString().slice(0, 10),
        invoice_status: "draft",
        ar_status:      "open",
        ticket_count:   rows.length,
        invoice_total:  total,
      });
      created++;
    }

    return NextResponse.json({ message: `${created} customer invoice(s) generated from ${tickets.length} approved tickets.` });
  } catch (err: unknown) {
    return NextResponse.json({ message: "Generation failed — " + (err instanceof Error ? err.message : "unknown error") }, { status: 500 });
  }
}
