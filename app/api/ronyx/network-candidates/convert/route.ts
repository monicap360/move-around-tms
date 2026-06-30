import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// strip-and-retry so a missing optional column never blocks the conversion
async function trySave(table: string, row: Record<string, any>): Promise<{ data: any; error: any }> {
  const res = await supabaseAdmin.from(table).insert(row).select("id").single();
  if (res.error) {
    const m = res.error.message?.match(/Could not find the '(.+?)' column/) || res.error.message?.match(/column "(.+?)" of relation/);
    if (m && m[1] in row && m[1] !== "organization_id") { const r = { ...row }; delete r[m[1]]; return trySave(table, r); }
  }
  return res;
}

// POST {id} — Phase 4: turn a hired candidate into a real Driver or Owner-Operator profile in
// the TMS (the moat). Idempotent: if already converted, returns the existing profile.
export async function POST(req: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { data: c, error } = await supabaseAdmin.from("network_candidates").select("*").eq("id", body.id).maybeSingle();
    if (error || !c) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    if (c.converted_driver_id) return NextResponse.json({ ok: true, type: "driver", profileId: c.converted_driver_id, link: `/ronyx/drivers/${c.converted_driver_id}`, already: true });
    if (c.converted_oo_id) return NextResponse.json({ ok: true, type: "owner_operator", profileId: c.converted_oo_id, link: `/ronyx/owner-operators?id=${c.converted_oo_id}`, already: true });

    const name = c.display_name || c.candidate_ref || "New hire";
    const stampNote = `Hired via Capacity Network — needs onboarding (compliance, paperwork, payroll/settlement setup).`;
    const now = new Date().toISOString();

    if (c.candidate_type === "owner_operator") {
      const { data, error: e } = await trySave("ronyx_owner_operators", {
        organization_id: orgId, company_name: name, status: "pending",
        notes: stampNote, business_address: c.service_area || null,
      });
      if (e || !data) return NextResponse.json({ error: e?.message || "Could not create owner-operator" }, { status: 500 });
      await supabaseAdmin.from("network_candidates").update({ pipeline_status: "hired", hired_at: now, converted_oo_id: data.id, updated_at: now }).eq("id", c.id);
      await supabaseAdmin.from("network_candidate_notes").insert({ organization_id: orgId, candidate_id: c.id, note: "Converted to a MoveAround Owner-Operator profile.", note_type: "task", created_by: body.by || "Office" }).then(() => {}, () => {});
      return NextResponse.json({ ok: true, type: "owner_operator", profileId: data.id, link: `/ronyx/owner-operators?id=${data.id}` });
    }

    // default: company driver
    const { data, error: e } = await trySave("drivers", {
      organization_id: orgId, name, status: "active",
      notes: stampNote, carrier_name: null, compliance_status: "needs_review",
    });
    if (e || !data) return NextResponse.json({ error: e?.message || "Could not create driver" }, { status: 500 });
    await supabaseAdmin.from("network_candidates").update({ pipeline_status: "hired", hired_at: now, converted_driver_id: data.id, updated_at: now }).eq("id", c.id);
    await supabaseAdmin.from("network_candidate_notes").insert({ organization_id: orgId, candidate_id: c.id, note: "Converted to a MoveAround Driver profile.", note_type: "task", created_by: body.by || "Office" }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, type: "driver", profileId: data.id, link: `/ronyx/drivers/${data.id}` });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
