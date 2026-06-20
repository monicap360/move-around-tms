import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const VALID_ENTITY_TYPES = [
  "jobs","tickets","customers","drivers","trucks",
  "owner_operators","invoices","payroll_invoices","maintenance_work_orders",
] as const;

const VALID_FIELD_TYPES = [
  "text","number","date","dropdown","multi_select","checkbox","currency","attachment","formula",
] as const;

const ADMIN_ROLES = ["owner","admin","system_admin","integration_admin"];

function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "field";
}

async function resolveSession(req: NextRequest) {
  const sb = createSupabaseServerClient();
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

/** GET /api/ronyx/settings/custom-fields?entity=jobs */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const entity = req.nextUrl.searchParams.get("entity") || undefined;

  let q = supabaseAdmin
    .from("organization_custom_fields")
    .select("*")
    .eq("organization_id", session.orgId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (entity) q = q.eq("entity_type", entity);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data || [], is_admin: ADMIN_ROLES.includes(session.role) });
}

/** POST /api/ronyx/settings/custom-fields — create a new field */
export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role))
    return NextResponse.json({ error: "Only Owner or Admin can create custom fields." }, { status: 403 });

  const body = await req.json();
  const entity_type = body.entity_type as string;
  const label       = (body.label || "").trim();
  const field_type  = body.field_type || "text";

  if (!VALID_ENTITY_TYPES.includes(entity_type as any))
    return NextResponse.json({ error: `Invalid entity_type: ${entity_type}` }, { status: 400 });
  if (!VALID_FIELD_TYPES.includes(field_type as any))
    return NextResponse.json({ error: `Invalid field_type: ${field_type}` }, { status: 400 });
  if (!label || label.length > 80)
    return NextResponse.json({ error: "Label is required and must be 80 characters or fewer." }, { status: 400 });

  if (["dropdown","multi_select"].includes(field_type)) {
    const opts = body.options;
    if (!Array.isArray(opts) || opts.length === 0)
      return NextResponse.json({ error: "Dropdown and multi-select fields require at least one option." }, { status: 400 });
  }

  const { orgId, user } = session;

  let field_key = body.field_key
    ? String(body.field_key).replace(/[^a-z0-9_]/g, "_").slice(0, 60)
    : toFieldKey(label);
  if (!/^[a-z]/.test(field_key)) field_key = "f_" + field_key;

  const { data: existing } = await supabaseAdmin
    .from("organization_custom_fields")
    .select("sort_order")
    .eq("organization_id", orgId)
    .eq("entity_type", entity_type)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order = existing?.[0]?.sort_order != null ? existing[0].sort_order + 10 : 10;

  const { data, error } = await supabaseAdmin
    .from("organization_custom_fields")
    .insert({
      organization_id: orgId,
      entity_type,
      field_key,
      label,
      field_type,
      options:     body.options     || null,
      placeholder: body.placeholder || null,
      help_text:   body.help_text   || null,
      is_required: Boolean(body.is_required),
      is_active:   true,
      sort_order,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("uq_ocf_org_entity_key"))
      return NextResponse.json({ error: "A field with that key already exists for this entity." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void supabaseAdmin.from("platform_admin_audit_log").insert({
    actor_id:    user.id,
    actor_email: user.email,
    org_id:      orgId,
    event_type:  "custom_field.created",
    details:     { field_id: data.id, entity_type, field_key, label, field_type },
  });

  return NextResponse.json({ field: data }, { status: 201 });
}

/** PUT /api/ronyx/settings/custom-fields — reorder fields */
export async function PUT(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role))
    return NextResponse.json({ error: "Only Owner or Admin can reorder custom fields." }, { status: 403 });

  const body = await req.json();
  if (!Array.isArray(body.order)) return NextResponse.json({ error: "order array required" }, { status: 400 });

  const { orgId } = session;
  const updates = body.order.map((id: string, idx: number) =>
    supabaseAdmin.from("organization_custom_fields")
      .update({ sort_order: (idx + 1) * 10 })
      .eq("id", id)
      .eq("organization_id", orgId)
  );

  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
