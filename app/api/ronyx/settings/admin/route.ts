import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sb = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const group = searchParams.get("group");

  let q = sb.from("ronyx_admin_settings").select("*").order("setting_group").order("setting_key");
  if (group) q = q.eq("setting_group", group);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return as nested map: { group: { key: value } }
  const map: Record<string, Record<string, any>> = {};
  for (const row of data ?? []) {
    (map[row.setting_group] ??= {})[row.setting_key] = row.setting_value;
  }
  return NextResponse.json({ settings: data ?? [], map });
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const body = await req.json();
  const { setting_group, setting_key, setting_value, updated_by_name } = body;

  if (!setting_group || !setting_key) {
    return NextResponse.json({ error: "setting_group and setting_key required." }, { status: 400 });
  }

  // Fetch old value for audit log
  const { data: old } = await sb
    .from("ronyx_admin_settings")
    .select("setting_value")
    .eq("setting_group", setting_group)
    .eq("setting_key", setting_key)
    .is("organization_id", null)
    .maybeSingle();

  const { data, error } = await sb
    .from("ronyx_admin_settings")
    .upsert(
      { organization_id: null, setting_group, setting_key, setting_value, updated_at: new Date().toISOString() },
      { onConflict: "organization_id,setting_group,setting_key", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write audit log
  await sb.from("ronyx_admin_audit_logs").insert({
    action: "setting_updated",
    setting_group,
    setting_key,
    old_value: old?.setting_value ?? null,
    new_value: setting_value,
    created_by_name: updated_by_name ?? "Admin",
  });

  return NextResponse.json({ setting: data });
}
