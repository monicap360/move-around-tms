import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sb = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const customer = searchParams.get("customer");
  const activeOnly = searchParams.get("active_only") !== "false";

  let q = sb
    .from("customer_dispatch_requirements")
    .select("*")
    .order("customer_name")
    .order("applies_to")
    .order("requirement_key");

  if (customer) q = q.eq("customer_name", customer);
  if (activeOnly) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by customer_name for the main listing view
  const grouped: Record<string, typeof data> = {};
  for (const row of data ?? []) {
    if (!grouped[row.customer_name]) grouped[row.customer_name] = [];
    grouped[row.customer_name].push(row);
  }

  return NextResponse.json({ requirements: data ?? [], grouped });
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const body = await req.json();

  const {
    customer_name, project_name, applies_to, requirement_key,
    requirement_label, requirement_status, blocks_dispatch,
    requires_expiration_check, requires_manager_override,
    assigned_role, assigned_staff_id, assigned_staff_name,
    is_active, notes,
  } = body;

  if (!customer_name || !applies_to || !requirement_key || !requirement_label) {
    return NextResponse.json({ error: "customer_name, applies_to, requirement_key, requirement_label are required." }, { status: 400 });
  }

  const { data, error } = await sb
    .from("customer_dispatch_requirements")
    .upsert(
      {
        customer_name, project_name: project_name ?? null,
        applies_to, requirement_key, requirement_label,
        requirement_status: requirement_status ?? "required",
        blocks_dispatch: blocks_dispatch ?? true,
        requires_expiration_check: requires_expiration_check ?? true,
        requires_manager_override: requires_manager_override ?? false,
        assigned_role: assigned_role ?? null,
        assigned_staff_id: assigned_staff_id ?? null,
        assigned_staff_name: assigned_staff_name ?? null,
        is_active: is_active ?? true,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: project_name
          ? "customer_name,project_name,applies_to,requirement_key"
          : "customer_name,applies_to,requirement_key",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requirement: data });
}

export async function PATCH(req: NextRequest) {
  const sb = supabaseAdmin;
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const { data, error } = await sb
    .from("customer_dispatch_requirements")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requirement: data });
}
