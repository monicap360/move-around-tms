import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orgId = (await resolveOrgId());
    let q = supabaseAdmin
      .from("integration_connections")
      .select("id,provider,status,settings,last_sync_at,last_sync_status,last_sync_error,created_at,updated_at");
    if (orgId) q = (q as any).eq("organization_id", orgId);

    const { data, error } = await q.order("provider");
    if (error) throw error;

    const PROVIDERS = ["rmis", "saferwatch", "mycarrierportal"];
    const connected = data ?? [];
    const result = PROVIDERS.map(p => {
      const existing = connected.find((c: any) => c.provider === p);
      return existing ?? { provider: p, status: "disconnected", settings: {}, last_sync_at: null };
    });

    return NextResponse.json({ connections: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
