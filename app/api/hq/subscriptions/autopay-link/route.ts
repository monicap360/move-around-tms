import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { gcConfigured, createMandateFlow } from "@/lib/gocardless";

export const dynamic = "force-dynamic";

// POST { id } → returns a GoCardless authorization link the customer uses to
// approve recurring ACH debits. Requires GOCARDLESS_ACCESS_TOKEN to be set.
export async function POST(req: NextRequest) {
  // Token/env come from HQ Billing Settings (hq_settings) or the environment.
  const { data: gset } = await supabaseAdmin.from("hq_settings").select("key, value").in("key", ["gocardless_token", "gocardless_env"]);
  const cfg: { token?: string; env?: string } = {};
  for (const r of gset || []) { if (r.key === "gocardless_token") cfg.token = r.value; if (r.key === "gocardless_env") cfg.env = r.value; }
  if (!gcConfigured(cfg)) {
    return NextResponse.json({ error: "Auto-pay isn't connected yet — add your GoCardless token in HQ → Billing → Settings." }, { status: 400 });
  }
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: sub } = await supabaseAdmin.from("hq_subscriptions").select("*").eq("id", b.id).single();
  if (!sub) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });

  const origin = new URL(req.url).origin;
  try {
    const { billingRequestId, authUrl } = await createMandateFlow({
      company: sub.customer_company,
      email: sub.email,
      name: sub.contact_name,
      redirectUri: `${origin}/hq/billing?authorized=${b.id}`,
    }, cfg);
    await supabaseAdmin.from("hq_subscriptions").update({
      mandate_ref: billingRequestId, mandate_status: "pending", ach_provider: "gocardless",
      payment_method: "ach_auto", autopay: true, updated_at: new Date().toISOString(),
    }).eq("id", b.id);
    return NextResponse.json({ ok: true, auth_url: authUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "GoCardless error." }, { status: 500 });
  }
}
