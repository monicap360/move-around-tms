import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// GET /api/ronyx/owner-operators/docs-needing-upload
// Returns every OO document that has a filename recorded but NO stored file
// (file_url null) — i.e. the docs whose actual file was never uploaded and must
// be re-uploaded. Scoped to the caller's organization.
export async function GET() {
  const orgId = await resolveOrgId();

  const { data: docs, error } = await supabaseAdmin
    .from("ronyx_oo_documents")
    .select("id, oo_id, doc_type, file_name, created_at")
    .is("file_url", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ooIds = [...new Set((docs || []).map((d) => d.oo_id))];
  const { data: oos } = ooIds.length
    ? await supabaseAdmin
        .from("ronyx_owner_operators")
        .select("id, company_name, organization_id")
        .in("id", ooIds)
    : { data: [] as any[] };

  const ooMap = new Map((oos || []).map((o: any) => [o.id, o]));

  const items = (docs || [])
    .map((d: any) => {
      const oo = ooMap.get(d.oo_id);
      if (!oo) return null;
      if (orgId && oo.organization_id && oo.organization_id !== orgId) return null;
      return {
        id:           d.id,
        oo_id:        d.oo_id,
        company_name: oo.company_name,
        doc_type:     d.doc_type,
        file_name:    d.file_name,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items, count: items.length });
}
