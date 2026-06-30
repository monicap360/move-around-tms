import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const num = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };

// GET ?settlement_id= — the line items (tickets) of a settlement, enriched with the full
// ticket detail (date, customer, truck, driver, material, hours/loads) from aggregate_tickets.
export async function GET(req: NextRequest) {
  try {
    await resolveOrgId();
    const id = new URL(req.url).searchParams.get("settlement_id");
    if (!id) return NextResponse.json({ lines: [] });
    const { data, error } = await supabaseAdmin.from("owner_operator_settlement_lines").select("*").eq("settlement_id", id).order("created_at");
    if (error) return NextResponse.json({ lines: [] });
    const lines = data || [];
    const nums = lines.map((l: any) => l.ticket_number).filter(Boolean);
    let tickets: any[] = [];
    if (nums.length) {
      const tk = await supabaseAdmin.from("aggregate_tickets").select("ticket_number, ticket_date, customer_name, truck_number, driver_name, material, total_hours, load_count, bill_rate, gross_amount").in("ticket_number", nums);
      tickets = tk.data || [];
    }
    const byNum: Record<string, any> = {};
    for (const t of tickets) byNum[t.ticket_number] = t;
    return NextResponse.json({
      lines: lines.map((l: any) => {
        const t = byNum[l.ticket_number] || {};
        const qty = num(t.total_hours) || num(t.load_count);
        const unit = num(t.total_hours) ? "hr" : "loads";
        return {
          ticket: l.ticket_number, type: l.line_type, amount: num(l.amount),
          date: (t.ticket_date || "").slice(5), customer: t.customer_name || null, truck: t.truck_number || null,
          driver: t.driver_name || null, material: t.material || null,
          qty: qty || null, unit, rate: num(t.bill_rate) || null, gross: num(t.gross_amount) || num(l.amount),
        };
      }),
    });
  } catch (e: any) { return NextResponse.json({ lines: [], error: e?.message }); }
}
