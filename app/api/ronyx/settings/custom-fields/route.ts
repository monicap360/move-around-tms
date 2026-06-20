import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

const VALID_ENTITY_TYPES = [
  "jobs","tickets","customers","drivers","trucks",
  "owner_operators","invoices","payroll_invoices","maintenance_work_orders",
] as const;

const VALID_FIELD_TYPES = [
  "text","number","date","dropdown","multi_select","checkbox","currency","attachment","formula",
] as const;

function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "field";
}

/** GET /api/ronyx/settings/custom-fields?entity=jobs */
export async function GET(req: NextRequest) {
  const entity = req.nextUrl.searchParams.get("entity") || undefined;
  const sb = createSupabaseServerClient();

  let q = sb
    .from("organization_custom_fields")
    .select("*")
    .eq("organization_id", ORG_ID)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (entity) q = q.eq("entity_type", entity);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data || [] });
}

/** POST /api/ronyx/settings/custom-fields — create a new field */
export async function POST(req: NextRequest) {
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

  const sb = createSupabaseServerClient();

  // Derive a unique field_key
  let field_key = body.field_key ? String(body.field_key).replace(/[^a-z0-9_]/g, "_").slice(0, 60) : toFieldKey(label);
  if (!/^[a-z]/.test(field_key)) field_key = "f_" + field_key;

  // Get next sort order
  const { data: existing } = await sb
    .from("organization_custom_fields")
    .select("sort_order")
    .eq("organization_id", ORG_ID)
    .eq("entity_type", entity_type)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order = existing?.[0]?.sort_order != null ? existing[0].sort_order + 10 : 10;

  const { data, error } = await sb
    .from("organization_custom_fields")
    .insert({
      organization_id: ORG_ID,
      entity_type,
      field_key,
      label,
      field_type,
      options:      body.options      || null,
      placeholder:  body.placeholder  || null,
      help_text:    body.help_text    || null,
      is_required:  Boolean(body.is_required),
      is_active:    true,
      sort_order,
    })
    .select("*")
    .single();

  if (error) {
    if (error.message.includes("uq_ocf_org_entity_key")) {
      return NextResponse.json({ error: "A field with that key already exists for this entity. Change the label or provide a unique field_key." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ field: data }, { status: 201 });
}

/** PUT /api/ronyx/settings/custom-fields — reorder fields */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!Array.isArray(body.order)) return NextResponse.json({ error: "order array required" }, { status: 400 });

  const sb = createSupabaseServerClient();
  const updates = body.order.map((id: string, idx: number) =>
    sb.from("organization_custom_fields")
      .update({ sort_order: (idx + 1) * 10, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", ORG_ID)
  );

  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
