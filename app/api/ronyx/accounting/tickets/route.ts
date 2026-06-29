import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Live Ticket-to-Invoice feed: maps aggregate_tickets onto the workspace's ticket shape.
// Returns { live: boolean, tickets: [...] } — the page falls back to demo data when empty.

function conf(v: any): string {
  const n = typeof v === "number" ? (v > 1 ? v / 100 : v) : null;
  if (n === null) return "Needs Review";
  if (n >= 0.95) return "Verified";
  if (n >= 0.8) return "High Confidence";
  if (n >= 0.6) return "Needs Review";
  if (n > 0) return "Low Confidence";
  return "Missing Field";
}
function inv(status: string | null, validation: string | null): string {
  const s = (status || "").toLowerCase(); const v = (validation || "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "partial" || s.includes("partial")) return "partial";
  if (s === "disputed") return "disputed";
  if (s === "invoiced") return "invoiced";
  if (v === "verified" || s === "rate_verified") return "rate_verified";
  if (s === "approved" || s === "ready") return "ready";
  return "needs_review";
}

export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin
      .from("aggregate_tickets")
      .select("ticket_number, ticket_date, customer_name, jobsite, material, origin, truck_number, driver_name, company_name_of_truck, quantity, load_count, total_hours, bill_rate, pay_rate, gross_amount, total_amount, total_pay, fuel_surcharge_amount, detention_amount, extraction_confidence, ocr_confidence, status, validation_status, payroll_status")
      .order("ticket_date", { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ live: false, tickets: [], error: error.message });

    const tickets = (data || []).map((t: any) => {
      const qty = t.total_hours ? Number(t.total_hours) : Number(t.load_count || t.quantity || 0);
      const unit = t.total_hours ? "hrs" : (t.load_count ? "loads" : "tons");
      const rate = Number(t.bill_rate || 0);
      const revenue = Number(t.gross_amount || t.total_amount || rate * qty || 0);
      const cost = Number(t.total_pay || (t.pay_rate ? t.pay_rate * qty : 0) || 0);
      return {
        id: t.ticket_number || "—",
        date: (t.ticket_date || "").slice(5),
        customer: t.customer_name || "—",
        job: t.jobsite || "—",
        material: t.material || "—",
        origin: t.origin || "",
        dest: "",
        truck: t.truck_number || "—",
        party: t.driver_name || t.company_name_of_truck || "—",
        qty, unit, rate, revenue, cost,
        fuel: Number(t.fuel_surcharge_amount || 0),
        pit: 0,
        other: Number(t.detention_amount || 0),
        conf: conf(t.extraction_confidence ?? t.ocr_confidence),
        inv: inv(t.status, t.validation_status),
        pay: (t.payroll_status === "paid" ? "Paid" : t.status === "invoiced" ? "Unpaid" : "—"),
      };
    });

    return NextResponse.json({ live: tickets.length > 0, tickets });
  } catch (e: any) {
    return NextResponse.json({ live: false, tickets: [], error: e?.message });
  }
}
