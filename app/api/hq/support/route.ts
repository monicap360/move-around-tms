import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ — support ticket inbox (concerns/questions from the site).
export async function GET() {
  const { data, error } = await supabaseAdmin.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ tickets: [], error: error.message });
  return NextResponse.json({ tickets: data || [] });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.status) patch.status = b.status;
  const { data, error } = await supabaseAdmin.from("support_tickets").update(patch).eq("id", b.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ticket: data });
}
