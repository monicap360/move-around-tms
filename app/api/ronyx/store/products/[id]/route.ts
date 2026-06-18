import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  const body = await request.json();

  // Build update payload — only include fields that were sent
  const updatePayload: Record<string, unknown> = {};

  if (body.title               !== undefined) updatePayload.title               = body.title;
  if (body.category            !== undefined) updatePayload.category            = body.category;
  if (body.description         !== undefined) updatePayload.description         = body.description;
  if (body.price               !== undefined) updatePayload.price               = body.price != null ? Number(body.price) : null;
  if (body.compare_at_price    !== undefined) updatePayload.compare_at_price    = body.compare_at_price != null ? Number(body.compare_at_price) : null;
  if (body.sizes               !== undefined) updatePayload.sizes               = Array.isArray(body.sizes) ? body.sizes : [];
  if (body.colors              !== undefined) updatePayload.colors              = Array.isArray(body.colors) ? body.colors : [];
  if (body.sku                 !== undefined) updatePayload.sku                 = body.sku || null;
  if (body.image_url           !== undefined) updatePayload.image_url           = body.image_url || null;
  if (body.image_alt           !== undefined) updatePayload.image_alt           = body.image_alt || null;
  if (body.shopify_product_url !== undefined) updatePayload.shopify_product_url = body.shopify_product_url || null;
  if (body.shopify_product_id  !== undefined) updatePayload.shopify_product_id  = body.shopify_product_id || null;
  if (body.buy_button_embed    !== undefined) updatePayload.buy_button_embed    = body.buy_button_embed || null;
  if (body.is_active           !== undefined) updatePayload.is_active           = Boolean(body.is_active);
  if (body.inventory_status    !== undefined) updatePayload.inventory_status    = body.inventory_status;
  if (body.inventory_count     !== undefined) updatePayload.inventory_count     = body.inventory_count != null ? Number(body.inventory_count) : null;
  if (body.sort_order          !== undefined) updatePayload.sort_order          = Number(body.sort_order);

  const { data, error } = await supabase
    .from("store_products")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  // Soft-delete: set is_active = false
  const { data, error } = await supabase
    .from("store_products")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data, deleted: true });
}
