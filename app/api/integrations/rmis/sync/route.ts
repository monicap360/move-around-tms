import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { normalizeRMIS, deriveCCBTasks } from "@/lib/integrations/normalize";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/integrations/rmis/sync
// Body: { owner_operator_id }
// Pulls fresh RMIS data for an OO record and creates CCB tasks.
export async function POST(req: Request) {
  try {
    const orgId = (await resolveOrgId());
    if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });

    const { owner_operator_id } = await req.json();
    if (!owner_operator_id) return NextResponse.json({ error: "owner_operator_id required." }, { status: 400 });

    // Load OO record
    const { data: oo } = await supabaseAdmin
      .from("ronyx_owner_operators")
      .select("id,company_name,mc_number,dot_number")
      .eq("id", owner_operator_id)
      .single();

    if (!oo) return NextResponse.json({ error: "Owner operator not found." }, { status: 404 });
    if (!oo.mc_number && !oo.dot_number) {
      return NextResponse.json({ error: "OO record has no MC# or DOT# — add one before syncing.", no_identifier: true }, { status: 400 });
    }

    // Load RMIS credentials
    const { data: conn } = await supabaseAdmin
      .from("integration_connections")
      .select("encrypted_credentials,status")
      .eq("organization_id", orgId)
      .eq("provider", "rmis")
      .single();

    if (!conn?.encrypted_credentials || conn.status !== "connected") {
      return NextResponse.json({ error: "RMIS not connected.", not_connected: true }, { status: 400 });
    }

    const creds = conn.encrypted_credentials as any;
    const params = new URLSearchParams();
    if (oo.mc_number)  params.set("mc",  oo.mc_number.replace(/^MC/i, ""));
    if (oo.dot_number) params.set("dot", oo.dot_number);

    const apiRes = await fetch(`${creds.api_url}/carrier?${params}`, {
      headers: {
        "X-Client-Id":     creds.client_id,
        "X-Client-Secret": creds.client_secret,
        "Accept":          "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });

    let raw: any = {};
    let fetchError = null;
    if (apiRes.ok) {
      raw = await apiRes.json();
    } else {
      fetchError = `RMIS returned ${apiRes.status}`;
    }

    const normalized = normalizeRMIS(raw);
    const { data: snap } = await supabaseAdmin
      .from("carrier_verification_snapshots")
      .insert({
        organization_id:     orgId,
        provider:            "rmis",
        owner_operator_id,
        mc_number:           oo.mc_number || null,
        dot_number:          oo.dot_number || null,
        raw_response:        raw,
        normalized_data:     normalized,
        verification_status: fetchError ? "error" : normalized.overall_status === "clear" ? "clear" : normalized.overall_status === "blocked" ? "blocked" : "needs_attention",
        authority_status:    normalized.authority.status,
        safety_status:       normalized.safety.rating,
        retrieved_at:        new Date().toISOString(),
        expires_at:          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    // Update integration_connections last_sync
    await supabaseAdmin
      .from("integration_connections")
      .update({
        last_sync_at:     new Date().toISOString(),
        last_sync_status: fetchError ? "error" : "success",
        last_sync_error:  fetchError,
      })
      .eq("organization_id", orgId)
      .eq("provider", "rmis");

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError, snapshot_id: snap?.id });
    }

    // Create CCB tasks from material issues
    const taskSpecs = deriveCCBTasks(normalized, oo.id, oo.company_name);
    const createdTasks: any[] = [];
    for (const spec of taskSpecs) {
      const { data: task } = await supabaseAdmin
        .from("ronyx_staff_tasks")
        .upsert({
          task_type:             spec.task_type,
          title:                 spec.title,
          description:           spec.description,
          priority:              spec.priority,
          status:                "open",
          assigned_to_name:      "CCB",
          due_date:              spec.due_date || null,
          document_type:         spec.document_type || null,
          owner_operator_id,
          owner_operator_name:   oo.company_name,
          entity_type:           "owner_operator",
          entity_id:             oo.id,
          source_type:           "carrier_verification",
          source_label:          "RMIS",
        }, { onConflict: "entity_type,entity_id,task_type", ignoreDuplicates: false })
        .select("id")
        .single();
      if (task) createdTasks.push(task);
    }

    return NextResponse.json({
      ok:          true,
      normalized,
      snapshot_id: snap?.id,
      tasks_created: createdTasks.length,
      ccb_tasks:   taskSpecs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
