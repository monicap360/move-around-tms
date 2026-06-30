import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Live Overview KPIs from the tables we control: customer_invoices + invoice_payments +
// aggregate_tickets. Returns { live, ...values }. The page keeps demo values when not live.
export async function GET() {
  try {
    await resolveOrgId();

    const invRes = await supabaseAdmin.from("customer_invoices").select("original_amount, amount_paid, due_date");
    const invoices = invRes.error ? [] : (invRes.data || []);
    const payRes = await supabaseAdmin.from("invoice_payments").select("amount");
    const payments = payRes.error ? [] : (payRes.data || []);
    const tkRes = await supabaseAdmin.from("aggregate_tickets").select("status, gross_amount, total_amount, total_pay, bill_rate, quantity, load_count, total_hours");
    const tickets = tkRes.error ? [] : (tkRes.data || []);
    const exRes = await supabaseAdmin.from("financial_exceptions").select("*").neq("status", "Resolved").order("created_at", { ascending: false }).limit(200);
    const exceptions = (exRes.error ? [] : (exRes.data || [])).map((e: any) => ({
      id: e.ref || e.id?.slice(0, 8), priority: e.priority || "Normal", type: e.exception_type || "—",
      customer: e.customer || "—", job: e.job || "—", ref: e.ref || "—", truck: e.truck || "—",
      party: e.party || "—", impact: Number(e.financial_impact || 0), impactLabel: e.impact_label || "",
      ageDays: Number(e.age_days || 0), assignedTo: e.assigned_to || null,
      action: e.recommended_action || "Review", status: e.status || "Open",
    }));

    const today = Date.now();
    const revenue = invoices.reduce((s: number, i: any) => s + Number(i.original_amount || 0), 0);
    const arOpen = invoices.reduce((s: number, i: any) => s + (Number(i.original_amount || 0) - Number(i.amount_paid || 0)), 0);
    const overdue = invoices.reduce((s: number, i: any) => {
      const bal = Number(i.original_amount || 0) - Number(i.amount_paid || 0);
      const due = i.due_date ? new Date(i.due_date).getTime() : today;
      return s + (bal > 0 && due < today ? bal : 0);
    }, 0);
    const cash = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const approved = tickets.filter((t: any) => (t.status || "").toLowerCase() === "approved" || (t.status || "").toLowerCase() === "ready");
    const unbilled = approved.reduce((s: number, t: any) => {
      const qty = Number(t.total_hours || t.load_count || t.quantity || 0);
      return s + Number(t.gross_amount || t.total_amount || (t.bill_rate || 0) * qty || 0);
    }, 0);
    const ticketRev = tickets.reduce((s: number, t: any) => {
      const qty = Number(t.total_hours || t.load_count || t.quantity || 0);
      return s + Number(t.gross_amount || t.total_amount || (t.bill_rate || 0) * qty || 0);
    }, 0);
    const ticketCost = tickets.reduce((s: number, t: any) => s + Number(t.total_pay || 0), 0);
    const grossMargin = ticketRev - ticketCost;

    // Only flip to live once there are real invoices — otherwise revenue/AR/cash read $0,
    // which looks worse than the demo. Tickets alone don't make the dashboard "live".
    const live = invoices.length > 0 || tickets.length > 0 || exceptions.length > 0;
    return NextResponse.json({
      live,
      revenue, arOpen, overdue, cash,
      unbilled, unbilledCount: approved.length,
      grossMargin, grossMarginPct: ticketRev ? (grossMargin / ticketRev) * 100 : 0,
      invoiceCount: invoices.length, ticketCount: tickets.length,
      exceptions,
    });
  } catch (e: any) {
    return NextResponse.json({ live: false, error: e?.message });
  }
}
