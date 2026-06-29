import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// GET — list customer invoices (+ payments) mapped onto the AR workspace shape.
// Returns { live, invoices }. Table may not exist yet → graceful empty (page shows demo).
export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin
      .from("customer_invoices")
      .select("*")
      .order("invoice_date", { ascending: false })
      .limit(500);
    if (error) return NextResponse.json({ live: false, invoices: [] });

    const today = Date.now();
    const invoices = (data || []).map((i: any) => {
      const original = Number(i.original_amount || 0);
      const paid = Number(i.amount_paid || 0);
      const due = i.due_date ? new Date(i.due_date).getTime() : today;
      const daysOut = Math.max(0, Math.round((today - due) / 86400000));
      return {
        id: i.invoice_number || i.id?.slice(0, 8),
        customer: i.customer_name || "—",
        date: (i.invoice_date || "").slice(5),
        due: (i.due_date || "").slice(5),
        original, paid,
        daysOut,
        dispute: i.dispute_status === "open" ? "Open" : "—",
        hold: !!i.credit_hold,
        lastContact: (i.updated_at || "").slice(5, 10),
        promise: null,
        collector: i.created_by || "—",
        creditLimit: 25000,
        jobs: i.job ? [i.job] : [],
      };
    });
    return NextResponse.json({ live: invoices.length > 0, invoices });
  } catch (e: any) {
    return NextResponse.json({ live: false, invoices: [], error: e?.message });
  }
}

// POST — create an invoice batch from approved tickets (grouped by customer on the client).
// Body: { invoices: [{ customer_name, job, original_amount, ticket_numbers[], ticket_count }], created_by }
export async function POST(req: Request) {
  try {
    const orgId = await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    const list = Array.isArray(body.invoices) ? body.invoices : [];
    if (!list.length) return NextResponse.json({ error: "No invoices to create." }, { status: 400 });

    // Next invoice number based on existing count (idempotent-ish; staff confirm before sending).
    const { count } = await supabaseAdmin.from("customer_invoices").select("*", { count: "exact", head: true });
    let seq = (count || 0) + 1;
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const rows = list.map((v: any) => ({
      organization_id: orgId,
      invoice_number: `INV-${String(2200 + seq++)}`,
      customer_name: v.customer_name,
      job: v.job || null,
      invoice_date: now.toISOString().slice(0, 10),
      due_date: due,
      original_amount: Number(v.original_amount || 0),
      amount_paid: 0,
      status: "open",
      ticket_numbers: v.ticket_numbers || [],
      ticket_count: Number(v.ticket_count || (v.ticket_numbers || []).length),
      created_by: body.created_by || "office",
    }));

    const { data, error } = await supabaseAdmin.from("customer_invoices").insert(rows).select("invoice_number, original_amount");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, created: data?.length || 0, total: (data || []).reduce((s: number, r: any) => s + Number(r.original_amount || 0), 0) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create invoices" }, { status: 500 });
  }
}
