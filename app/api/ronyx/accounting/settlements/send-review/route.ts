import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const fmt = (n: number) => (n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Email an owner-operator the secure link to review/approve/dispute their settlement.
export async function POST(req: NextRequest) {
  try {
    await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    const id = body.settlement_id;
    if (!id) return NextResponse.json({ error: "settlement_id required" }, { status: 400 });

    const { data: s, error } = await supabaseAdmin.from("owner_operator_settlements").select("*").eq("id", id).maybeSingle();
    if (error || !s) return NextResponse.json({ error: "Settlement not found" }, { status: 404 });

    // Recipient: the owner-operator's contact email.
    let to = body.to as string | undefined;
    if (!to && s.oo_id) {
      const { data: oo } = await supabaseAdmin.from("ronyx_owner_operators").select("contact_email").eq("id", s.oo_id).maybeSingle();
      to = oo?.contact_email || undefined;
    }
    if (!to) return NextResponse.json({ error: "No email on file for this owner-operator — add a contact email first." }, { status: 400 });

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const link = `${base}/settlement-review/${id}`;
    const net = Number(s.agreed_pay || 0) - Number(s.fuel_deductions || 0) - Number(s.insurance_deductions || 0)
      - Number(s.trailer_deductions || 0) - Number(s.advances || 0) - Number(s.other_deductions || 0) + Number(s.reimbursements || 0);

    const result = await sendEmail({
      to,
      subject: `Your settlement is ready to review — ${s.settlement_period || ""}`.trim(),
      text: `Hi ${s.company_name || ""},\n\nYour settlement for ${s.settlement_period || "this period"} is ready.\nNet payment: ${fmt(net)}.\n\nReview, approve, or dispute it here:\n${link}\n\n— Ronyx Logistics`,
      html: `<div style="font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:480px">
        <p>Hi ${s.company_name || ""},</p>
        <p>Your settlement for <strong>${s.settlement_period || "this period"}</strong> is ready to review.</p>
        <p style="font-size:1.4rem;font-weight:800;color:#15803d">Net payment: ${fmt(net)}</p>
        <p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Review your settlement →</a></p>
        <p style="color:#64748b;font-size:0.85rem">You can approve it or dispute a line item right from your phone.</p>
        <p style="color:#94a3b8;font-size:0.8rem">— Ronyx Logistics</p>
      </div>`,
    });

    if (!result.ok) return NextResponse.json({ error: result.error, simulated: result.simulated }, { status: result.simulated ? 200 : 500 });
    return NextResponse.json({ ok: true, to, id: result.id });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
