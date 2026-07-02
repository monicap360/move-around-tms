import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ — customer subscriptions billed by ACH/check (no Stripe).
const FIELDS = [
  "customer_company", "contact_name", "email", "phone", "plan_name", "amount",
  "billing_cycle", "status", "start_date", "next_due_date", "last_paid_date",
  "notes", "autopay", "payment_method",
] as const;

const clean = (b: any) => {
  const row: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (!(f in b)) continue;
    let v = b[f];
    if (v === "") v = f === "amount" ? 0 : null;
    row[f] = v;
  }
  return row;
};

function advance(dateStr: string | null, cycle: string): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const d = new Date(base);
  if ((cycle || "monthly") === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from("hq_subscriptions").select("*").order("next_due_date", { ascending: true }).limit(5000);
  if (error) return NextResponse.json({ subscriptions: [], error: error.message });
  return NextResponse.json({ subscriptions: data || [] });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.customer_company?.trim()) return NextResponse.json({ error: "Customer company is required." }, { status: 400 });
  const row = clean(b);
  if (!row.next_due_date && !b.next_due_date) row.next_due_date = advance(b.start_date || null, b.billing_cycle || "monthly");
  const { data, error } = await supabaseAdmin.from("hq_subscriptions").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subscription: data });
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Record a payment: stamp last_paid, roll next_due forward by the cycle.
  if (b.action === "mark_paid") {
    const { data: sub } = await supabaseAdmin.from("hq_subscriptions").select("*").eq("id", b.id).single();
    if (!sub) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    const today = new Date().toISOString().slice(0, 10);
    const nextDue = advance(sub.next_due_date || today, sub.billing_cycle);
    const { data, error } = await supabaseAdmin.from("hq_subscriptions")
      .update({ last_paid_date: today, next_due_date: nextDue, status: "active", updated_at: today }).eq("id", b.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, subscription: data });
  }

  const patch = { ...clean(b), updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from("hq_subscriptions").update(patch).eq("id", b.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subscription: data });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("hq_subscriptions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
