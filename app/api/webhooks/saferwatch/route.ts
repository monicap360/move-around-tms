import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { normalizeSaferWatch, deriveCCBTasks } from "@/lib/integrations/normalize";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const mcNumber  = raw?.mc_number ?? raw?.mcNumber ?? null;
    const dotNumber = raw?.dot_number ?? raw?.dotNumber ?? null;
    const eventType = raw?.event_type ?? "carrier_watch_alert";

    // Resolve tenant from the carrier (mc/dot -> owner_operator -> org). No env,
    // no default org — hard-fail if the carrier maps to no tenant.
    let ooId: string | null = null;
    let ooName = "Carrier";
    let orgId: string | null = null;
    if (mcNumber || dotNumber) {
      let q = supabaseAdmin.from("ronyx_owner_operators").select("id,company_name,organization_id") as any;
      if (mcNumber) q = q.eq("mc_number", mcNumber); else q = q.eq("dot_number", dotNumber);
      const { data: oo } = await q.limit(1).single();
      if (oo) { ooId = oo.id; ooName = oo.company_name; orgId = oo.organization_id; }
    }
    if (!orgId) return NextResponse.json({ error: "Unrecognized carrier — cannot resolve tenant" }, { status: 422 });

    const normalized = normalizeSaferWatch(raw?.carrier ?? raw);
    const vsData: any = { organization_id: orgId, provider: "saferwatch", owner_operator_id: ooId, mc_number: mcNumber, dot_number: dotNumber, raw_response: raw, normalized_data: normalized, verification_status: normalized.overall_status === "clear" ? "clear" : normalized.overall_status === "blocked" ? "blocked" : "needs_attention", authority_status: normalized.authority.status, safety_status: normalized.safety.rating };
    const { data: snap } = await supabaseAdmin.from("carrier_verification_snapshots").insert(vsData).select("id").single();

    if (orgId) {
      await supabaseAdmin.from("carrier_verification_events").insert({ organization_id: orgId, owner_operator_id: ooId, provider: "saferwatch", event_type: eventType, severity: normalized.overall_status === "blocked" ? "critical" : "high", title: "SaferWatch alert - " + (normalized.legal_name || mcNumber || dotNumber), details: { issues: normalized.compliance_issues }, source_snapshot_id: snap?.id });
    }

    if (orgId && ooId && normalized.compliance_issues.length > 0) {
      const taskSpecs = deriveCCBTasks(normalized, ooId, ooName);
      for (const spec of taskSpecs) {
        await supabaseAdmin.from("ronyx_staff_tasks").upsert({ task_type: spec.task_type, title: spec.title, description: spec.description, priority: spec.priority, status: "open", assigned_to_name: "CCB", due_date: spec.due_date || null, owner_operator_id: ooId, owner_operator_name: ooName, entity_type: "owner_operator", entity_id: ooId, source_type: "carrier_verification", source_label: "SaferWatch" }, { onConflict: "entity_type,entity_id,task_type", ignoreDuplicates: false });
      }
    }
    return NextResponse.json({ ok: true, snapshot_id: snap?.id });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
