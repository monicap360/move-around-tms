import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const num = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };

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

// PATCH {id, action} — approve / hold / add deduction / add reimbursement. Recomputes net.
export async function PATCH(req: NextRequest) {
  try {
    await resolveOrgId();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { data: s, error } = await supabaseAdmin.from("owner_operator_settlements").select("*").eq("id", b.id).maybeSingle();
    if (error || !s) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });

    const patch: Record<string, any> = {};
    if (b.action === "approve") patch.approval_status = "approved";
    else if (b.action === "hold") { patch.approval_status = "draft"; patch.payment_status = "hold"; }
    else if (b.action === "deduction") patch.other_deductions = num(s.other_deductions) + num(b.amount);
    else if (b.action === "reimbursement") patch.reimbursements = num(s.reimbursements) + num(b.amount);
    else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    // recompute net from the merged values
    const m = { ...s, ...patch };
    patch.net_settlement = num(m.agreed_pay) - num(m.fuel_deductions) - num(m.insurance_deductions) - num(m.trailer_deductions) - num(m.advances) - num(m.other_deductions) + num(m.reimbursements);

    const { error: uErr } = await supabaseAdmin.from("owner_operator_settlements").update(patch).eq("id", b.id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, net: patch.net_settlement });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
