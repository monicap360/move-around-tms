import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORG_FILTER = process.env.RONYX_ORG_ID
  ? `id.eq.${process.env.RONYX_ORG_ID},organization_code.eq.RONYX`
  : `organization_code.eq.RONYX`;

async function resolveOrgId(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .or(ORG_FILTER)
    .limit(1)
    .single();
  return data?.id as string | null;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const orgId = await resolveOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { data: sessions } = await supabase
    .from("ronyx_implementation_sessions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ sessions: sessions ?? [] });
}
