import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

const VALID_FIELD_TYPES = [
  "text","number","date","dropdown","multi_select","checkbox","currency","attachment","formula",
] as const;

/** PATCH /api/ronyx/settings/custom-fields/[field_id] — update a field */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { field_id: string } },
) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };

  if ("label"       in body) {
    const label = (body.label || "").trim();
    if (!label || label.length > 80) return NextResponse.json({ error: "Label must be 1–80 characters." }, { status: 400 });
    patch.label = label;
  }
  if ("field_type"  in body) {
    if (!VALID_FIELD_TYPES.includes(body.field_type)) return NextResponse.json({ error: "Invalid field_type." }, { status: 400 });
    patch.field_type = body.field_type;
  }
  if ("options"     in body) patch.options     = body.options;
  if ("placeholder" in body) patch.placeholder = body.placeholder || null;
  if ("help_text"   in body) patch.help_text   = body.help_text   || null;
  if ("is_required" in body) patch.is_required = Boolean(body.is_required);
  if ("is_active"   in body) patch.is_active   = Boolean(body.is_active);
  if ("sort_order"  in body) patch.sort_order  = Number(body.sort_order);

  const { data, error } = await sb
    .from("organization_custom_fields")
    .update(patch)
    .eq("id",              params.field_id)
    .eq("organization_id", ORG_ID)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: data });
}

/** DELETE /api/ronyx/settings/custom-fields/[field_id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { field_id: string } },
) {
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from("organization_custom_fields")
    .delete()
    .eq("id",              params.field_id)
    .eq("organization_id", ORG_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
