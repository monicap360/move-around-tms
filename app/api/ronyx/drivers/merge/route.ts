import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const norm = (x: string) => (x || "").toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
const BACKFILL = ["phone", "email", "address", "license_number", "license_state", "license_expiration", "license_expiration_date",
  "cdl_class", "medical_card_expiration", "medical_card_number", "mvr_expiration", "carrier_name", "assigned_truck_number",
  "owner_operator_name", "owner_operator_company", "dob", "hire_date"];

// GET — duplicate groups (same normalized name, 2+ records) for the merge tool.
export async function GET() {
  try {
    const orgId = await resolveOrgId();
    let q = supabaseAdmin.from("drivers").select("id, name, phone, license_number, notes, created_at, carrier_name, assigned_truck_number").neq("status", "deleted");
    if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
    const { data, error } = await q.limit(5000);
    if (error) return NextResponse.json({ groups: [] });
    const byName = new Map<string, any[]>();
    for (const d of data || []) { const n = norm(d.name); if (!n) continue; (byName.get(n) || byName.set(n, []).get(n))!.push(d); }
    const groups = [...byName.values()].filter(g => g.length > 1)
      .map(g => g.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")))
      .sort((a, b) => (a[0].name || "").localeCompare(b[0].name || ""));
    return NextResponse.json({ groups, count: groups.length });
  } catch (e: any) { return NextResponse.json({ groups: [], error: e?.message }); }
}

// POST {keepId, mergeIds[]} — backfill keeper's empty fields from the merged records,
// append their notes, then soft-delete the merged records.
export async function POST(req: NextRequest) {
  try {
    await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    const keepId = body.keepId;
    const mergeIds: string[] = (body.mergeIds || []).filter((id: string) => id && id !== keepId);
    if (!keepId || !mergeIds.length) return NextResponse.json({ error: "Pick a record to keep and at least one to merge." }, { status: 400 });

    const ids = [keepId, ...mergeIds];
    const { data: recs, error } = await supabaseAdmin.from("drivers").select("*").in("id", ids);
    if (error || !recs) return NextResponse.json({ error: "Could not load records" }, { status: 500 });
    const keep = recs.find((r: any) => r.id === keepId);
    const others = recs.filter((r: any) => r.id !== keepId);
    if (!keep) return NextResponse.json({ error: "Keeper not found" }, { status: 404 });

    const patch: Record<string, any> = {};
    for (const f of BACKFILL) {
      if (keep[f] == null || keep[f] === "") {
        const src = others.find((o: any) => o[f] != null && o[f] !== "");
        if (src) patch[f] = src[f];
      }
    }
    const extraNotes = others.map((o: any) => o.notes).filter(Boolean).join(" | ");
    if (extraNotes) patch.notes = [keep.notes, `[merged] ${extraNotes}`].filter(Boolean).join(" | ");

    if (Object.keys(patch).length) await supabaseAdmin.from("drivers").update(patch).eq("id", keepId);
    const { error: delErr } = await supabaseAdmin.from("drivers").update({ status: "deleted" }).in("id", mergeIds);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, kept: keepId, merged: mergeIds.length, filled: Object.keys(patch) });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
