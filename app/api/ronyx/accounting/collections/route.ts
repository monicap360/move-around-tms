import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Collections communication log — collection_notes (created by the accounting migration).
// GET ?customer=Name returns the note history; POST appends a note / promise-to-pay.
export async function GET(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const customer = new URL(req.url).searchParams.get("customer");
    let q = supabaseAdmin.from("collection_notes").select("*").order("created_at", { ascending: false }).limit(200);
    if (orgId) q = q.eq("organization_id", orgId);
    if (customer) q = q.eq("customer_name", customer);
    const { data, error } = await q;
    if (error) return NextResponse.json({ notes: [] });
    return NextResponse.json({ notes: (data || []).map((n: any) => ({
      id: n.id, customer: n.customer_name, note: n.note,
      promise: n.promise_to_pay || null, by: n.created_by || "Staff",
      at: (n.created_at || "").slice(0, 10),
    })) });
  } catch (e: any) { return NextResponse.json({ notes: [], error: e?.message }); }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    if (!body.customer_name || (!body.note && !body.promise_to_pay)) {
      return NextResponse.json({ error: "customer_name and a note or promise date are required" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.from("collection_notes").insert({
      organization_id: orgId, customer_name: body.customer_name,
      note: body.note || (body.promise_to_pay ? `Promise to pay recorded: ${body.promise_to_pay}` : null),
      promise_to_pay: body.promise_to_pay || null, created_by: body.created_by || "Staff",
    }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
