import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = supabaseAdmin;
    const { data: rows } = await supabase
      .from("invoice_ticket_rows")
      .select("id, contractor_name, truck_number, ticket_date, ticket_value, payout")
      .eq("payroll_invoice_status", "ready")
      .neq("void_status", "void")
      .limit(500);

    if (!rows?.length) return NextResponse.json({ message: "No ticket rows ready for payroll invoicing." });

    const byContractor = rows.reduce((acc, r) => {
      const key = r.contractor_name || "Unknown Contractor";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {} as Record<string, typeof rows>);

    let created = 0;
    for (const [contractor, rList] of Object.entries(byContractor)) {
      const ticket_total = rList.reduce((a, r) => a + (r.ticket_value || 0), 0);
      const total_paid   = rList.reduce((a, r) => a + (r.payout || 0), 0);
      await supabase.from("payroll_invoices").insert({
        contractor_name:   contractor,
        truck_number:      rList[0].truck_number || null,
        payroll_week_start: rList[0].ticket_date || null,
        payroll_week_end:  rList[rList.length - 1].ticket_date || null,
        status:            "draft",
        ticket_total,
        deduction_total:   0,
        total_paid,
      });
      created++;
    }

    return NextResponse.json({ message: `${created} payroll invoice(s) generated from ${rows.length} ticket rows.` });
  } catch (err: unknown) {
    return NextResponse.json({ message: "Generation failed — " + (err instanceof Error ? err.message : "unknown error") }, { status: 500 });
  }
}
