import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Sales lead tracker (CRM-lite) for the sales team (e.g. Andrew).
// GET → all leads for the org. POST → create. PUT → update by id. DELETE → by id.

const FIELDS = [
  "owner_name", "company_name", "contact_name", "phone", "email", "source",
  "stage", "estimated_value", "trucks_count", "notes", "next_follow_up", "last_contact_date",
  "current_tools",
] as const;

const clean = (body: any) => {
  const row: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (!(f in body)) continue;
    let v = body[f];
    if (f === "current_tools") { row[f] = Array.isArray(v) ? v : []; continue; }
    if (v === "") v = f === "estimated_value" ? 0 : null;
    row[f] = v;
  }
  return row;
};

export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ leads: [], error: "Could not resolve your organization." });
  const { data, error } = await supabaseAdmin
    .from("ronyx_sales_leads")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ leads: [], error: error.message });
  return NextResponse.json({ leads: data || [] });
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.company_name?.trim()) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  const row = { ...clean(body), organization_id: orgId, owner_name: (body.owner_name || "").trim() || null };
  const { data, error } = await supabaseAdmin.from("ronyx_sales_leads").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, lead: data });
}

export async function PUT(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch = { ...clean(body), updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin
    .from("ronyx_sales_leads").update(patch).eq("id", body.id).eq("organization_id", orgId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, lead: data });
}

export async function DELETE(req: NextRequest) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("ronyx_sales_leads").delete().eq("id", id).eq("organization_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
