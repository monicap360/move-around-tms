import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { data: sessions } = await supabase
    .from("ronyx_implementation_sessions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ sessions: sessions ?? [] });
}
