import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const VALID_FIELD_TYPES = [
  "text","number","date","dropdown","multi_select","checkbox","currency","attachment","formula",
] as const;

const ADMIN_ROLES = ["owner","admin","system_admin","integration_admin"];

async function resolveSession(req: NextRequest) {
  const sb = supabaseAdmin;
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  const { data: seat } = await supabaseAdmin
    .from("user_seats")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!seat) return null;
  return { user, orgId: seat.organization_id as string, role: seat.role as string };
}

/** PATCH /api/ronyx/settings/custom-fields/[field_id] — update a field */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { field_id: string } },
) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role))
    return NextResponse.json({ error: "Only Owner or Admin can edit custom fields." }, { status: 403 });

  const body = await req.json();
  const { orgId, user } = session;

  // Check if this field has existing values before allowing field_type change
  if ("field_type" in body) {
    if (!VALID_FIELD_TYPES.includes(body.field_type))
      return NextResponse.json({ error: "Invalid field_type." }, { status: 400 });

    // Warn: field_type changes can invalidate existing saved values.
    // The UI should surface a confirmation before sending this change.
  }

  const patch: Record<string, unknown> = {};

  if ("label" in body) {
    const label = (body.label || "").trim();
    if (!label || label.length > 80) return NextResponse.json({ error: "Label must be 1–80 characters." }, { status: 400 });
    patch.label = label;
  }
  if ("field_type"  in body) patch.field_type  = body.field_type;
  if ("options"     in body) {
    // Validate dropdown options
    if (["dropdown","multi_select"].includes(body.field_type ?? "") && (!Array.isArray(body.options) || body.options.length === 0))
      return NextResponse.json({ error: "Dropdown fields require at least one option." }, { status: 400 });
    patch.options = body.options;
  }
  if ("placeholder" in body) patch.placeholder = body.placeholder || null;
  if ("help_text"   in body) patch.help_text   = body.help_text   || null;
  if ("is_required" in body) patch.is_required = Boolean(body.is_required);
  if ("sort_order"  in body) patch.sort_order  = Number(body.sort_order);
  // Archive instead of hard-delete when is_active = false and values may exist
  if ("is_active"   in body) patch.is_active   = Boolean(body.is_active);

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("organization_custom_fields")
    .update(patch)
    .eq("id",              params.field_id)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabaseAdmin.from("platform_admin_audit_log").insert({
    actor_id:    user.id,
    actor_email: user.email,
    org_id:      orgId,
    event_type:  "custom_field.updated",
    details:     { field_id: params.field_id, changes: patch },
  });

  return NextResponse.json({ field: data });
}

/** DELETE /api/ronyx/settings/custom-fields/[field_id] — archives the field */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { field_id: string } },
) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role))
    return NextResponse.json({ error: "Only Owner or Admin can delete custom fields." }, { status: 403 });

  const { orgId, user } = session;

  // Soft-delete (archive) to avoid breaking historical records that reference this field_key
  const { data, error } = await supabaseAdmin
    .from("organization_custom_fields")
    .update({ is_active: false })
    .eq("id",              params.field_id)
    .eq("organization_id", orgId)
    .select("field_key, label, entity_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void supabaseAdmin.from("platform_admin_audit_log").insert({
    actor_id:    user.id,
    actor_email: user.email,
    org_id:      orgId,
    event_type:  "custom_field.archived",
    details:     { field_id: params.field_id, field_key: data?.field_key, entity_type: data?.entity_type },
  });

  return NextResponse.json({ success: true, archived: true });
}
