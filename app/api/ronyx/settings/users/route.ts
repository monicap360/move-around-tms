import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("ronyx_staff_users")
    .select("*")
    .order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  if (!body.full_name) return NextResponse.json({ error: "full_name required." }, { status: 400 });

  const { data, error } = await sb
    .from("ronyx_staff_users")
    .insert({
      full_name:  body.full_name,
      email:      body.email      ?? null,
      phone:      body.phone      ?? null,
      role_id:    body.role_id    ?? null,
      role_name:  body.role_name  ?? null,
      department: body.department ?? null,
      status:     body.status     ?? "active",
      on_shift:   body.on_shift   ?? false,
      notes:      body.notes      ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("ronyx_admin_audit_logs").insert({
    action: "user_added",
    setting_group: "users",
    new_value: { full_name: body.full_name, role_name: body.role_name },
    created_by_name: "Admin",
  });

  return NextResponse.json({ user: data });
}

export async function PATCH(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const { data, error } = await sb
    .from("ronyx_staff_users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
