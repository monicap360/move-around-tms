import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
const getOrgId = () => process.env.RONYX_ORG_ID ?? null;

export async function POST(req: Request) {
  try {
    const orgId = getOrgId();
    const raw = await req.json();
    const eventType = raw?.event_type ?? raw?.type ?? "carrier_onboarding_update";
    const mcNumber  = raw?.mc_number ?? raw?.mcNumber ?? null;
    const dotNumber = raw?.dot_number ?? raw?.dotNumber ?? null;

    const vsData: any = { organization_id: orgId ?? "00000000-0000-0000-0000-000000000000", provider: "mycarrierportal", mc_number: mcNumber, dot_number: dotNumber, raw_response: raw, verification_status: "needs_attention" };
    const { data: snap } = await supabaseAdmin.from("carrier_verification_snapshots").insert(vsData).select("id").single();

    if (orgId) {
      await supabaseAdmin.from("carrier_verification_events").insert({ organization_id: orgId, provider: "mycarrierportal", event_type: eventType, severity: "info", title: "MyCarrierPortal event - " + (mcNumber || dotNumber || eventType), details: raw, source_snapshot_id: snap?.id });
    }
    return NextResponse.json({ ok: true, received: true });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
