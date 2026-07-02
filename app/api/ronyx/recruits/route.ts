import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Recruiting Center — track driver/carrier recruits and push the good ones into
// MoveAround's Find Drivers pool (driver_profiles).
const FIELDS = [
  "recruiter", "candidate_type", "full_name", "phone", "email", "source",
  "service_area", "equipment", "pay_range", "stage", "notes", "next_follow_up", "last_contacted_at",
] as const;

const clean = (body: any) => {
  const row: Record<string, unknown> = {};
  for (const f of FIELDS) { if (!(f in body)) continue; let v = body[f]; if (v === "") v = null; row[f] = v; }
  return row;
};

export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ recruits: [], error: "Org not resolved" });
  const { data, error } = await supabaseAdmin.from("ronyx_recruits").select("*").eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ recruits: [], error: error.message });
  return NextResponse.json({ recruits: data || [] });
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.full_name?.trim()) return NextResponse.json({ error: "Recruit name is required." }, { status: 400 });
  const row = { ...clean(body), organization_id: orgId };
  const { data, error } = await supabaseAdmin.from("ronyx_recruits").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recruit: data });
}

export async function PUT(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Push a recruit into the Find Drivers pool (driver_profiles).
  if (body.action === "push_to_find_drivers") {
    const { data: rec } = await supabaseAdmin.from("ronyx_recruits").select("*").eq("id", body.id).eq("organization_id", orgId).single();
    if (!rec) return NextResponse.json({ error: "Recruit not found." }, { status: 404 });
    if (rec.pushed_to_find_drivers) return NextResponse.json({ ok: true, already: true, driver_profile_id: rec.driver_profile_id });
    const { data: dp, error: dpErr } = await supabaseAdmin.from("driver_profiles").insert({
      organization_id: orgId,
      full_name: rec.full_name,
      phone: rec.phone || null,
      email: rec.email || null,
      status: "available",
      position_role: rec.candidate_type === "owner_operator" ? "Owner Operator" : "Driver",
    }).select("id").single();
    if (dpErr) return NextResponse.json({ error: `Couldn't add to Find Drivers: ${dpErr.message}` }, { status: 500 });
    const { data: updated } = await supabaseAdmin.from("ronyx_recruits")
      .update({ pushed_to_find_drivers: true, driver_profile_id: dp.id, stage: "hired", updated_at: new Date().toISOString() })
      .eq("id", rec.id).select("*").single();
    return NextResponse.json({ ok: true, pushed: true, driver_profile_id: dp.id, recruit: updated });
  }

  const patch = { ...clean(body), updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from("ronyx_recruits").update(patch).eq("id", body.id).eq("organization_id", orgId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recruit: data });
}

export async function DELETE(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const id = new URL(req.url).searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("ronyx_recruits").delete().eq("id", id).eq("organization_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
