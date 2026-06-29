import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Billing ticket rows now come from aggregate_tickets ("the agg portion") — the same
// source as payroll and customer-invoice generation — so billing and pay always match.
// (The old invoice_ticket_rows table doesn't exist.)
export async function GET() {
  try {
    const supabase = supabaseAdmin as any;
    const orgId = await resolveOrgId();

    let q = supabase.from("aggregate_tickets").select("*").order("ticket_date", { ascending: false }).limit(1000);
    if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ rows: [], error: error.message });

    const rows = (data || []).map((t: any) => ({
      id:                      t.id,
      contractor_name:         t.driver_name || t.carrier_name || t.company_name || "",
      truck_number:            t.truck_number || t.truck_id || "",
      ticket_date:             t.ticket_date || null,
      ticket_number:           t.ticket_number || t.weight_ticket_number || "",
      job_name:                t.customer_name || t.jobsite || t.client_name || "",
      job_description:         t.material || "",
      qty:                     num(t.quantity || t.load_count || t.cubic_yards),
      haul_rate:               num(t.pay_rate || t.rate),
      full_rate:               num(t.bill_rate || t.rate),
      ticket_value:            num(t.total_bill ?? t.total_amount ?? t.amount),
      void_status:             t.voided ? "voided" : "",
      job_number:              t.load_number || t.load_id || "",
      notes:                   typeof t.notes === "string" ? t.notes : "",
      lewis_percent:           null,
      contractor_percent:      null,
      c_truck_total:           null,
      payout_rate:             num(t.pay_rate || t.rate),
      payout:                  num(t.total_pay ?? t.amount),
      customer_invoice_status: t.billing_status || (t.billing_matched ? "matched" : "pending"),
      payroll_invoice_status:  t.payroll_status || "pending",
      reconciliation_status:   t.reconciliation_status || t.crosscheck_status || "",
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ rows: [], error: String(e?.message || e) });
  }
}
