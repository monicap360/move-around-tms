import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseAdmin;

    // Aggregate tickets — approved, unpaid, void
    const { data: ticketStats } = await supabase
      .from("aggregate_tickets")
      .select("status, payment_status, billing_hold, payroll_hold, quantity, rate")
      .in("status", ["approved", "pending", "needs_review", "matched", "voided"]);

    const rows = ticketStats || [];
    const approved      = rows.filter(r => r.status === "approved").length;
    const void_tickets  = rows.filter(r => r.status === "voided").length;
    const unpaid        = rows.filter(r => r.payment_status === "unpaid" && r.status !== "voided").length;
    const ticket_value_total = rows.reduce((a, r) => a + ((r.quantity || 0) * (r.rate || 0)), 0);

    // Customer invoices
    const { data: custData } = await supabase.from("customer_invoices").select("invoice_status, invoice_total").limit(1000);
    const custReady   = (custData || []).filter(r => r.invoice_status === "draft").length;
    const ready_to_send = (custData || []).filter(r => r.invoice_status === "sent").length;

    // Payroll invoices
    const { data: payData } = await supabase.from("payroll_invoices").select("status, ticket_total, deduction_total, total_paid").limit(1000);
    const payReady        = (payData || []).filter(r => r.status === "draft").length;
    const payout_total    = (payData || []).reduce((a, r) => a + (r.ticket_total || 0), 0);
    const deductions_total = (payData || []).reduce((a, r) => a + (r.deduction_total || 0), 0);
    const total_paid      = (payData || []).reduce((a, r) => a + (r.total_paid || 0), 0);

    // Exceptions
    const { count: exceptions_count } = await supabase
      .from("invoice_reconciliation_exceptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    return NextResponse.json({
      kpis: {
        approved_tickets:        approved,
        customer_invoices_ready: custReady,
        payroll_invoices_ready:  payReady,
        unpaid_tickets:          unpaid,
        void_tickets:            void_tickets,
        ticket_value_total:      ticket_value_total,
        payout_total:            payout_total,
        deductions_total:        deductions_total,
        total_paid:              total_paid,
        invoice_mismatches:      exceptions_count || 0,
        missing_proof:           0,
        ready_to_send:           ready_to_send,
      },
    });
  } catch {
    return NextResponse.json({ kpis: null });
  }
}
