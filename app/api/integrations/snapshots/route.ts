import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
const getOrgId = () => process.env.RONYX_ORG_ID ?? null;

// GET /api/integrations/snapshots?oo_id=&mc_number=&limit=
export async function GET(req: Request) {
  try {
    const orgId = getOrgId();
    const { searchParams } = new URL(req.url);
    const ooId     = searchParams.get("oo_id");
    const mcNumber = searchParams.get("mc_number");
    const limit    = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    let q = supabaseAdmin
      .from("carrier_verification_snapshots")
      .select("id,provider,mc_number,dot_number,verification_status,authority_status,safety_status,normalized_data,retrieved_at,expires_at")
      .order("retrieved_at", { ascending: false })
      .limit(limit);

    if (orgId)    q = (q as any).eq("organization_id", orgId);
    if (ooId)     q = (q as any).eq("owner_operator_id", ooId);
    if (mcNumber) q = (q as any).eq("mc_number", mcNumber);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ snapshots: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
