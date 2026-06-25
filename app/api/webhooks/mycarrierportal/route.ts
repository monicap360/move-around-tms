import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const eventType = raw?.event_type ?? raw?.type ?? "carrier_onboarding_update";
    const mcNumber  = raw?.mc_number ?? raw?.mcNumber ?? null;
    const dotNumber = raw?.dot_number ?? raw?.dotNumber ?? null;

    // Resolve tenant from the carrier (mc/dot -> owner_operator -> org). Hard-fail.
    let orgId: string | null = null;
    if (mcNumber || dotNumber) {
      let q = supabaseAdmin.from("ronyx_owner_operators").select("organization_id") as any;
      if (mcNumber) q = q.eq("mc_number", mcNumber); else q = q.eq("dot_number", dotNumber);
      const { data: oo } = await q.limit(1).single();
      if (oo) orgId = oo.organization_id;
    }
    if (!orgId) return NextResponse.json({ error: "Unrecognized carrier — cannot resolve tenant" }, { status: 422 });

    const vsData: any = { organization_id: orgId, provider: "mycarrierportal", mc_number: mcNumber, dot_number: dotNumber, raw_response: raw, verification_status: "needs_attention" };
    const { data: snap } = await supabaseAdmin.from("carrier_verification_snapshots").insert(vsData).select("id").single();

    if (orgId) {
      await supabaseAdmin.from("carrier_verification_events").insert({ organization_id: orgId, provider: "mycarrierportal", event_type: eventType, severity: "info", title: "MyCarrierPortal event - " + (mcNumber || dotNumber || eventType), details: raw, source_snapshot_id: snap?.id });
    }
    return NextResponse.json({ ok: true, received: true });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
