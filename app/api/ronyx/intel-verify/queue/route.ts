import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function resolveOrg(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabaseAdmin.from("organization_members").select("org_id").eq("user_id", userId).single();
  return data?.org_id ?? null;
}

export async function GET(req: NextRequest) {
  const url    = new URL(req.url);
  const status = url.searchParams.get("status");
  const ooId   = url.searchParams.get("oo_id");
  const limit  = Math.min(parseInt(url.searchParams.get("limit") ?? "60"), 200);

  const { data: { session } } = await supabaseAdmin.auth.getSession();
  const orgId = await resolveOrg(session?.user?.id ?? null);

  try {
    let q = supabaseAdmin
      .from("intel_verify_queue")
      .select("id,org_id,oo_id,upload_id,file_name,file_type,doc_type,extracted_fields,status,high_confidence_count,low_confidence_count,approved_by,approved_at,approved_fields,rejected_fields,extraction_error,created_by,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (orgId) q = q.eq("org_id", orgId);
    if (status) q = q.eq("status", status);
    if (ooId)   q = q.eq("oo_id", ooId);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ ok: true, items: [], note: "intel_verify_queue table not yet created. Run migration to enable queue." });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin
      .from("intel_verify_queue")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
