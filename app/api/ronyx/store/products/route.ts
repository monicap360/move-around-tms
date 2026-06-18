import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveOrgId(supabase: ReturnType<typeof createSupabaseServerClient>): Promise<string | null> {
  const fromEnv = process.env.RONYX_ORG_ID;
  if (fromEnv) return fromEnv;

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.id as string;
}

export async function GET(_request: NextRequest) {
  const supabase = createSupabaseServerClient();

  const orgId = await resolveOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("store_products")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  const orgId = await resolveOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const payload = {
    organization_id:     orgId,
    title:               body.title,
    category:            body.category || "Hoodie / Company Merch",
    description:         body.description || null,
    price:               body.price != null ? Number(body.price) : null,
    compare_at_price:    body.compare_at_price != null ? Number(body.compare_at_price) : null,
    sizes:               Array.isArray(body.sizes) ? body.sizes : [],
    colors:              Array.isArray(body.colors) ? body.colors : [],
    sku:                 body.sku || null,
    image_url:           body.image_url || null,
    image_alt:           body.image_alt || null,
    shopify_product_url: body.shopify_product_url || null,
    shopify_product_id:  body.shopify_product_id || null,
    buy_button_embed:    body.buy_button_embed || null,
    is_active:           body.is_active !== false,
    inventory_status:    body.inventory_status || "in_stock",
    inventory_count:     body.inventory_count != null ? Number(body.inventory_count) : null,
    sort_order:          body.sort_order != null ? Number(body.sort_order) : 0,
  };

  const { data, error } = await supabase
    .from("store_products")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
