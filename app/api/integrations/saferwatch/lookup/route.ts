import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { normalizeSaferWatch, deriveCCBTasks } from "@/lib/integrations/normalize";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/integrations/saferwatch/lookup
// Body: { mc_number?, dot_number?, owner_operator_id?, owner_operator_name? }
export async function POST(req: Request) {
  try {
    const orgId = (await resolveOrgId());
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    const body = await req.json();
    const { mc_number, dot_number, owner_operator_id, owner_operator_name } = body;
    if (!mc_number && !dot_number) {
      return NextResponse.json({ error: "mc_number or dot_number required." }, { status: 400 });
    }

    const { data: conn } = await supabaseAdmin
      .from("integration_connections")
      .select("encrypted_credentials,status")
      .eq("organization_id", orgId).eq("provider", "saferwatch").single();

    if (!conn?.encrypted_credentials || conn.status !== "connected") {
      return NextResponse.json({ error: "SaferWatch not connected.", not_connected: true }, { status: 400 });
    }

    const creds = conn.encrypted_credentials as any;
    const params = new URLSearchParams();
    if (mc_number)  params.set("mc",  mc_number.replace(/^MC/i, ""));
    if (dot_number) params.set("dot", dot_number);

    const apiRes = await fetch(`${creds.api_url}/carrier?${params}`, {
      headers: { "X-API-Key": creds.api_key, "X-User-Key": creds.user_key, "Accept": "application/json" },
      signal: AbortSignal.timeout(20000),
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => apiRes.statusText);
      return NextResponse.json({ error: `SaferWatch returned ${apiRes.status}: ${text}` }, { status: 502 });
    }

    const raw = await apiRes.json();
    const { data: snap } = await supabaseAdmin
      .from("carrier_verification_snapshots")
      .insert({ organization_id: orgId, provider: "saferwatch", owner_operator_id: owner_operator_id || null, mc_number: mc_number || null, dot_number: dot_number || null, raw_response: raw, retrieved_at: new Date().toISOString(), expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .select("id").single();

    const normalized = normalizeSaferWatch(raw, snap?.id);
    if (snap?.id) {
      await supabaseAdmin.from("carrier_verification_snapshots").update({ normalized_data: normalized, verification_status: normalized.overall_status === "clear" ? "clear" : normalized.overall_status === "blocked" ? "blocked" : "needs_attention", authority_status: normalized.authority.status, safety_status: normalized.safety.rating }).eq("id", snap.id);
    }

    const ccbTasks = deriveCCBTasks(normalized, owner_operator_id || "", owner_operator_name || "Carrier");
    return NextResponse.json({ ok: true, normalized, snapshot_id: snap?.id, ccb_tasks: ccbTasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
