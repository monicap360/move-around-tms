import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

export const STAGES = ["saved", "unlocked", "contacted", "interested", "screening", "compliance_review", "offer", "ready_to_dispatch", "hired", "not_a_fit"];

// GET — all candidates the company is working + pipeline counts.
export async function GET() {
  try {
    const orgId = await resolveOrgId();
    let q = supabaseAdmin.from("network_candidates").select("*").order("updated_at", { ascending: false }).limit(1000);
    if (orgId) q = q.eq("organization_id", orgId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ live: false, candidates: [], counts: {} });
    const candidates = data || [];
    const counts: Record<string, number> = {};
    for (const st of STAGES) counts[st] = 0;
    for (const c of candidates) counts[c.pipeline_status] = (counts[c.pipeline_status] || 0) + 1;
    return NextResponse.json({ live: true, candidates, counts, total: candidates.length });
  } catch (e: any) { return NextResponse.json({ live: false, candidates: [], counts: {}, error: e?.message }); }
}

// POST — upsert a candidate by (org, candidate_ref). Used by Save / Unlock.
export async function POST(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const b = await req.json().catch(() => ({}));
    if (!b.candidate_ref) return NextResponse.json({ error: "candidate_ref required" }, { status: 400 });
    let existing = supabaseAdmin.from("network_candidates").select("id, pipeline_status").eq("candidate_ref", b.candidate_ref);
    if (orgId) existing = existing.eq("organization_id", orgId);
    const { data: found } = await existing.maybeSingle();
    const now = new Date().toISOString();
    if (found) {
      const patch: Record<string, any> = { updated_at: now };
      // only advance status forward (don't downgrade unlocked→saved)
      if (b.pipeline_status && STAGES.indexOf(b.pipeline_status) > STAGES.indexOf(found.pipeline_status)) patch.pipeline_status = b.pipeline_status;
      if (b.pipeline_status === "unlocked") patch.unlocked_at = now;
      if (b.display_name) patch.display_name = b.display_name;
      const { data } = await supabaseAdmin.from("network_candidates").update(patch).eq("id", found.id).select("*").single();
      return NextResponse.json({ ok: true, candidate: data });
    }
    const row: Record<string, any> = {
      organization_id: orgId, candidate_ref: b.candidate_ref, candidate_type: b.candidate_type || "driver",
      display_name: b.display_name || null, pipeline_status: b.pipeline_status || "saved",
      service_area: b.service_area || null, equipment: b.equipment || null, match_score: b.match_score ?? null,
      match_reasons: b.match_reasons || null,
      unlocked_at: b.pipeline_status === "unlocked" ? now : null,
    };
    const { data, error } = await supabaseAdmin.from("network_candidates").insert(row).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, candidate: data });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

// PATCH — update a candidate (status / assign / task), optionally add a note + audit-style log.
export async function PATCH(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const b = await req.json().catch(() => ({}));
    if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (b.pipeline_status) { patch.pipeline_status = b.pipeline_status; if (b.pipeline_status === "hired") patch.hired_at = new Date().toISOString(); }
    if (b.assigned_to !== undefined) patch.assigned_to = b.assigned_to;
    if (b.next_task !== undefined) patch.next_task = b.next_task;
    if (b.due_at !== undefined) patch.due_at = b.due_at;
    if (b.last_contacted) patch.last_contacted_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("network_candidates").update(patch).eq("id", b.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (b.note) await supabaseAdmin.from("network_candidate_notes").insert({ organization_id: orgId, candidate_id: b.id, note: b.note, note_type: b.note_type || "note", created_by: b.by || "Office" }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, candidate: data });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
