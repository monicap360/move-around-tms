import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id   = searchParams.get("entity_id");
  const limit       = parseInt(searchParams.get("limit") || "100", 10);

  const supabase = supabaseAdmin;

  let query = supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, entity_name, action, performed_by, performed_by_name, notes, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (entity_type) query = query.eq("entity_type", entity_type);
  if (entity_id)   query = query.eq("entity_id", entity_id);

  const { data, error } = await query;

  if (error) {
    // Table may not exist yet — return empty list rather than 500
    return NextResponse.json({ logs: [], error: error.message });
  }

  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const {
    entity_type, entity_id, entity_name,
    action, performed_by, performed_by_name,
    notes, metadata,
  } = body;

  if (!entity_type || !action) {
    return NextResponse.json({ error: "entity_type and action are required" }, { status: 400 });
  }

  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      entity_type, entity_id, entity_name,
      action, performed_by, performed_by_name,
      notes, metadata,
    })
    .select("id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ log: data });
}
