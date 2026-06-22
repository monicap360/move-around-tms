import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from("ronyx_roles")
    .select("*")
    .eq("is_active", true)
    .order("role_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ roles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const body = await req.json();

  if (!body.role_name) return NextResponse.json({ error: "role_name required." }, { status: 400 });

  const { data, error } = await sb
    .from("ronyx_roles")
    .upsert(
      {
        organization_id:  null,
        role_name:        body.role_name,
        role_description: body.role_description ?? null,
        permissions:      body.permissions ?? {},
        is_system_role:   false,
        is_active:        true,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: "organization_id,role_name", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("ronyx_admin_audit_logs").insert({
    action: "role_updated",
    setting_group: "roles",
    new_value: { role_name: body.role_name, permissions: body.permissions },
    created_by_name: "Admin",
  });

  return NextResponse.json({ role: data });
}
