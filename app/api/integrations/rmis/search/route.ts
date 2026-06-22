import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { normalizeRMIS, deriveCCBTasks } from "@/lib/integrations/normalize";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const getOrgId = () => process.env.RONYX_ORG_ID ?? null;

async function getRMISCredentials(orgId: string) {
  const { data } = await supabaseAdmin
    .from("integration_connections")
    .select("encrypted_credentials,status")
    .eq("organization_id", orgId)
    .eq("provider", "rmis")
    .single();
  return data;
}

// POST /api/integrations/rmis/search
// Body: { mc_number?, dot_number?, owner_operator_id?, owner_operator_name? }
export async function POST(req: Request) {
  try {
    const orgId = getOrgId();
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    const body = await req.json();
    const { mc_number, dot_number, owner_operator_id, owner_operator_name } = body;

    if (!mc_number && !dot_number) {
      return NextResponse.json({ error: "mc_number or dot_number is required." }, { status: 400 });
    }

    const conn = await getRMISCredentials(orgId);
    if (!conn || conn.status !== "connected" || !conn.encrypted_credentials) {
      return NextResponse.json({ error: "RMIS is not connected. Configure credentials in Admin → Integrations.", not_connected: true }, { status: 400 });
    }

    const creds = conn.encrypted_credentials as any;
    const params = new URLSearchParams();
    if (mc_number)  params.set("mc",  mc_number.replace(/^MC/i, ""));
    if (dot_number) params.set("dot", dot_number);

    const apiRes = await fetch(`${creds.api_url}/carrier?${params}`, {
      headers: {
        "X-Client-Id":     creds.client_id,
        "X-Client-Secret": creds.client_secret,
        "Accept":          "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => apiRes.statusText);
      return NextResponse.json({ error: `RMIS returned ${apiRes.status}: ${text}` }, { status: 502 });
    }

    const raw = await apiRes.json();

    // Store raw snapshot
    const { data: snap } = await supabaseAdmin
      .from("carrier_verification_snapshots")
      .insert({
        organization_id:  orgId,
        provider:         "rmis",
        owner_operator_id: owner_operator_id || null,
        mc_number:        mc_number || null,
        dot_number:       dot_number || null,
        raw_response:     raw,
        retrieved_at:     new Date().toISOString(),
        expires_at:       new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    const normalized = normalizeRMIS(raw, snap?.id);

    // Update snapshot with normalized data + status
    if (snap?.id) {
      await supabaseAdmin
        .from("carrier_verification_snapshots")
        .update({
          normalized_data:     normalized,
          verification_status: normalized.overall_status === "clear" ? "clear" : normalized.overall_status === "blocked" ? "blocked" : "needs_attention",
          authority_status:    normalized.authority.status,
          safety_status:       normalized.safety.rating,
          insurance_status:    normalized.compliance_issues.some(i => i.toLowerCase().includes("insur")) ? "issues_found" : "ok",
        })
        .eq("id", snap.id);
    }

    // Derive and suggest CCB tasks (caller decides whether to create them)
    const ccbTasks = deriveCCBTasks(normalized, owner_operator_id || "", owner_operator_name || "Carrier");

    // Log verification event
    if (snap?.id) {
      await supabaseAdmin.from("carrier_verification_events").insert({
        organization_id:    orgId,
        owner_operator_id:  owner_operator_id || null,
        provider:           "rmis",
        event_type:         "manual_search",
        severity:           normalized.overall_status === "blocked" ? "critical" : normalized.overall_status === "needs_attention" ? "high" : "info",
        title:              `RMIS lookup — ${normalized.legal_name || mc_number || dot_number}`,
        details:            { mc_number, dot_number, issues: normalized.compliance_issues },
        source_snapshot_id: snap.id,
      });
    }

    return NextResponse.json({
      ok:           true,
      normalized,
      snapshot_id:  snap?.id ?? null,
      ccb_tasks:    ccbTasks,
      raw_summary: {
        found: true,
        mc:    normalized.mc_number,
        dot:   normalized.dot_number,
        name:  normalized.legal_name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
