import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// PUBLIC (no auth) — a driver/owner-operator reviews a settlement via an unguessable UUID link.
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("owner_operator_settlements").select("*").eq("id", id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  const net = Number(data.agreed_pay || 0) - Number(data.fuel_deductions || 0) - Number(data.insurance_deductions || 0)
    - Number(data.trailer_deductions || 0) - Number(data.advances || 0) - Number(data.other_deductions || 0) + Number(data.reimbursements || 0);
  return NextResponse.json({
    company: data.company_name, period: data.settlement_period, loads: data.loads,
    gross: Number(data.gross_revenue || 0), agreed: Number(data.agreed_pay || 0),
    fuel: Number(data.fuel_deductions || 0), insurance: Number(data.insurance_deductions || 0),
    trailer: Number(data.trailer_deductions || 0), advances: Number(data.advances || 0),
    other: Number(data.other_deductions || 0), reimbursements: Number(data.reimbursements || 0),
    net, approval_status: data.approval_status, payment_status: data.payment_status,
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
  });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const { data: cur, error: e1 } = await supabaseAdmin.from("owner_operator_settlements").select("blocks").eq("id", id).maybeSingle();
  if (e1 || !cur) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
  const blocks: string[] = Array.isArray(cur.blocks) ? cur.blocks : [];
  if (action === "dispute") {
    const reason = (body.reason || "no reason given").toString().slice(0, 300);
    const { error } = await supabaseAdmin.from("owner_operator_settlements")
      .update({ blocks: [...blocks, `Driver disputed: ${reason}`], approval_status: "draft" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Your dispute was sent to the office for review." });
  }
  if (action === "approve") {
    const { error } = await supabaseAdmin.from("owner_operator_settlements")
      .update({ blocks: blocks.filter(b => !b.startsWith("Driver disputed")) }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Thanks — your settlement is approved." });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
