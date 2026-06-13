import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unit_id");
  const limit  = parseInt(searchParams.get("limit") || "50");

  let query = supabase
    .from("maintenance_activity_log")
    .select("*, maintenance_units(unit_number)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unitId) query = query.eq("unit_id", unitId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ logs: [], error: error.message });

  const logs = (data || []).map((l: any) => ({
    id:          l.id,
    unit_number: l.maintenance_units?.unit_number || "",
    unit_id:     l.unit_id,
    action:      l.action,
    old_value:   l.old_value,
    new_value:   l.new_value,
    created_at:  l.created_at,
  }));

  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("maintenance_activity_log")
    .insert({
      unit_id:       body.unit_id,
      work_order_id: body.work_order_id || null,
      action:        body.action,
      old_value:     body.old_value || null,
      new_value:     body.new_value || null,
      created_by:    body.created_by || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ log: data }, { status: 201 });
}
