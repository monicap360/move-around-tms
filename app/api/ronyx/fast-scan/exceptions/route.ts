import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const num = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const ticketAmt = (t: any) => num(t.gross_amount ?? t.total_amount ?? (num(t.bill_rate) * num(t.quantity ?? t.load_count ?? t.total_hours)));

// GET — open exceptions, highest financial impact first (the Office Priority Queue source).
export async function GET(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const role = new URL(req.url).searchParams.get("role") || "";
    let q = supabaseAdmin.from("document_exceptions").select("*").neq("status", "resolved").order("financial_impact_total", { ascending: false }).limit(300);
    if (orgId) q = q.eq("organization_id", orgId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ live: false, exceptions: [], note: "Run the Fast Scan migration first." });
    let rows = data || [];
    const focus: Record<string, string[]> = {
      billing: ["Rate mismatch", "Missing customer rate", "Ticket already billed", "Missing PO", "Billing hold"],
      payroll: ["Payroll hold", "Ticket already paid", "Missing driver proof", "Settlement hold"],
      dispatch: ["Proof not received", "Truck mismatch", "Driver mismatch", "Job mismatch"],
    };
    if (role && focus[role]) rows = [...rows].sort((a, b) => (focus[role].includes(b.exception_type) ? 1 : 0) - (focus[role].includes(a.exception_type) ? 1 : 0));
    const billingHeld = rows.reduce((s, r) => s + num(r.financial_impact_billing), 0);
    const payrollHeld = rows.reduce((s, r) => s + num(r.financial_impact_payroll), 0);
    return NextResponse.json({ live: true, exceptions: rows, total: rows.length, billingHeld, payrollHeld });
  } catch (e: any) { return NextResponse.json({ live: false, exceptions: [], error: e?.message }); }
}

// POST {action:"scan"} — run detection and write new exceptions (deduped by ticket+type).
export async function POST(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    if (body.action !== "scan") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    const [tkRes, docRes, rcRes, exRes] = await Promise.all([
      supabaseAdmin.from("aggregate_tickets").select("*").limit(2000),
      supabaseAdmin.from("fast_scan_documents").select("*").neq("scan_status", "deleted").limit(2000),
      supabaseAdmin.from("customer_rate_cards").select("customer_name, material, rate"),
      supabaseAdmin.from("document_exceptions").select("ticket_number, exception_type, status"),
    ]);
    const tickets = tkRes.data || [], docs = docRes.data || [], rateCards = rcRes.data || [];
    const open = new Set((exRes.data || []).filter((e: any) => e.status !== "resolved").map((e: any) => `${e.ticket_number}|${e.exception_type}`));

    const found: any[] = [];
    const add = (e: any) => { const k = `${e.ticket_number}|${e.exception_type}`; if (open.has(k)) return; open.add(k); found.push(e); };

    // 1. Duplicate ticket numbers (across documents)
    const byNum: Record<string, any[]> = {};
    for (const d of docs) { if (d.ticket_number) (byNum[d.ticket_number] = byNum[d.ticket_number] || []).push(d); }
    for (const [tn, ds] of Object.entries(byNum)) if (ds.length > 1) {
      const amt = ticketAmt(tickets.find((t: any) => t.ticket_number === tn) || {});
      add({ ticket_number: tn, exception_type: "Duplicate ticket number", severity: "high", financial_impact_billing: amt, financial_impact_total: amt, waiting_on: "Billing", recommended_action: "Confirm and archive the duplicate", driver_name: ds[0].driver_name, truck_number: ds[0].truck_number });
    }
    // 2. OCR low confidence
    for (const d of docs) if (d.confidence_score != null && num(d.confidence_score) < 70)
      add({ ticket_number: d.ticket_number, document_id: d.id, exception_type: "OCR low confidence", severity: "medium", recommended_action: "Confirm the uncertain field or request a better photo", driver_name: d.driver_name, truck_number: d.truck_number });
    // 3. Tickets with no rate
    for (const t of tickets) if (!num(t.bill_rate) && !num(t.gross_amount))
      add({ ticket_number: t.ticket_number, exception_type: "Missing customer rate", severity: "high", waiting_on: "Billing", recommended_action: "Apply the customer rate card", customer: t.customer_name, driver_name: t.driver_name, truck_number: t.truck_number });
    // 4. Rate mismatch vs rate card
    for (const t of tickets) {
      const rc = rateCards.find((r: any) => (r.customer_name || "").toLowerCase() === (t.customer_name || "").toLowerCase() && (!r.material || r.material === t.material));
      if (rc && num(t.bill_rate) && num(rc.rate) && num(t.bill_rate) !== num(rc.rate)) {
        const diff = Math.abs(num(t.bill_rate) - num(rc.rate)) * num(t.quantity ?? t.load_count ?? t.total_hours ?? 1);
        add({ ticket_number: t.ticket_number, exception_type: "Rate mismatch", severity: "high", financial_impact_billing: diff, financial_impact_total: diff, waiting_on: "Billing", recommended_action: "Compare ticket rate with the rate card", customer: t.customer_name, driver_name: t.driver_name, truck_number: t.truck_number, manager_approval_required: true });
      }
    }
    // 5. Missing proof from expectations
    const { data: exps } = await supabaseAdmin.from("ticket_expectations").select("*").eq("status", "expected");
    for (const e of exps || []) if (!e.received_document_id)
      add({ ticket_number: e.ticket_number, exception_type: "Proof not received", severity: "high", waiting_on: "Dispatch", recommended_action: "Send reminder to driver", customer: e.customer, job: e.job, driver_name: e.driver_name, truck_number: e.truck_number });

    if (!found.length) return NextResponse.json({ ok: true, created: 0, message: "No new exceptions — all clear." });
    const rows = found.map(f => ({ organization_id: orgId, status: "open", ...f, financial_impact_total: f.financial_impact_total ?? f.financial_impact_billing ?? 0 }));
    const { data: ins, error } = await supabaseAdmin.from("document_exceptions").insert(rows).select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, created: ins?.length || 0 });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

// PATCH {id, assign?:name | resolve:{code,notes,by}} — assign or resolve + write audit.
export async function PATCH(req: NextRequest) {
  try {
    await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    let action = "update";
    if (body.assign) { patch.assigned_to_name = body.assign; patch.assigned_at = new Date().toISOString(); action = "assigned"; }
    if (body.resolve) { patch.status = "resolved"; patch.resolution_code = body.resolve.code || "resolved"; patch.resolution_notes = body.resolve.notes || null; patch.resolved_by_user_id = body.resolve.by || null; patch.resolved_at = new Date().toISOString(); action = "resolved"; }
    const { data, error } = await supabaseAdmin.from("document_exceptions").update(patch).eq("id", body.id).select("ticket_number").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await supabaseAdmin.from("document_audit_events").insert({ exception_id: body.id, ticket_number: data?.ticket_number, actor: body.resolve?.by || body.assign || "staff", action, new_value: body.assign || body.resolve?.code || null, reason: body.resolve?.notes || null }).then(() => {}, () => {});
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
