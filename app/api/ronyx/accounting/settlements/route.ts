import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Live OO settlements from owner_operator_settlements (created by the accounting migration).
export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin.from("owner_operator_settlements").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ live: false, items: [] });
    const items = (data || []).map((s: any) => ({
      id: s.id?.slice(0, 8), reviewId: s.id, oo: s.company_name || "—", company: s.company_name || "—", period: s.settlement_period || "—",
      loads: Number(s.loads || 0), gross: Number(s.gross_revenue || 0), agreed: Number(s.agreed_pay || 0),
      fuel: Number(s.fuel_deductions || 0), ins: Number(s.insurance_deductions || 0), trailer: Number(s.trailer_deductions || 0),
      advance: Number(s.advances || 0), other: Number(s.other_deductions || 0), reimb: Number(s.reimbursements || 0),
      appr: ({ draft: "Draft", awaiting: "Awaiting Approval", approved: "Approved", paid: "Paid" } as any)[(s.approval_status || "draft")] || "Draft",
      paid: s.payment_status === "paid", blocks: Array.isArray(s.blocks) ? s.blocks : [],
    }));
    return NextResponse.json({ live: items.length > 0, items });
  } catch (e: any) { return NextResponse.json({ live: false, items: [], error: e?.message }); }
}
