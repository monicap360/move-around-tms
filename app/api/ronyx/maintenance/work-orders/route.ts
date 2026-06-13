import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unit_id");

  let query = supabase
    .from("maintenance_work_orders")
    .select("*, maintenance_units(unit_number)")
    .order("opened_date", { ascending: false });

  if (unitId) query = query.eq("unit_id", unitId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ work_orders: [], error: error.message });

  const work_orders = (data || []).map((wo: any) => ({
    ...wo,
    unit_number: wo.maintenance_units?.unit_number || "",
  }));

  return NextResponse.json({ work_orders });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("maintenance_work_orders")
    .insert({
      unit_id:        body.unit_id,
      issue:          body.issue,
      priority:       body.priority || "Medium",
      status:         body.status || "Open",
      opened_date:    body.opened_date || new Date().toISOString().slice(0, 10),
      due_date:       body.due_date || null,
      vendor:         body.vendor || null,
      estimated_cost: body.estimated_cost || 0,
      actual_cost:    body.actual_cost || null,
      notes:          body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ work_order: data }, { status: 201 });
}
