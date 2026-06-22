import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from("ronyx_document_routing_rules")
    .select("*")
    .order("applies_to")
    .order("document_label");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const sb = supabaseAdmin;
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const { data, error } = await sb
    .from("ronyx_document_routing_rules")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("ronyx_admin_audit_logs").insert({
    action: "document_routing_updated",
    setting_group: "document_routing",
    new_value: updates,
    created_by_name: "Admin",
  });

  return NextResponse.json({ rule: data });
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const body = await req.json();

  if (!body.document_type || !body.document_label || !body.applies_to || !body.default_route) {
    return NextResponse.json({ error: "document_type, document_label, applies_to, default_route required." }, { status: 400 });
  }

  const { data, error } = await sb
    .from("ronyx_document_routing_rules")
    .upsert(
      {
        organization_id:          null,
        document_type:            body.document_type,
        document_label:           body.document_label,
        applies_to:               body.applies_to,
        default_route:            body.default_route,
        requires_expiration_date: body.requires_expiration_date ?? false,
        blocks_dispatch:          body.blocks_dispatch ?? false,
        blocks_payroll:           body.blocks_payroll  ?? false,
        assigned_role:            body.assigned_role   ?? null,
        is_active:                true,
        updated_at:               new Date().toISOString(),
      },
      { onConflict: "organization_id,document_type,applies_to", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
