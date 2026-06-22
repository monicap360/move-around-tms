import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  store_name:          "MoveAround Merch Store",
  store_enabled:       true,
  shopify_store_url:   null,
  shopify_embed_code:  null,
  embed_mode:          "link",
  shopify_shop_domain: null,
};

async function resolveOrgId(supabase: typeof supabaseAdmin): Promise<string | null> {
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
  const supabase = supabaseAdmin;

  const orgId = await resolveOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If no row exists yet, return defaults with org_id so the client can PUT later
  if (!data) {
    return NextResponse.json({
      settings: {
        ...DEFAULT_SETTINGS,
        organization_id: orgId,
        id: null,
        created_at: null,
        updated_at: null,
      },
    });
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(request: NextRequest) {
  const supabase = supabaseAdmin;

  const orgId = await resolveOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await request.json();

  const upsertPayload = {
    organization_id:     orgId,
    store_name:          body.store_name          ?? DEFAULT_SETTINGS.store_name,
    store_enabled:       body.store_enabled        !== undefined ? Boolean(body.store_enabled) : DEFAULT_SETTINGS.store_enabled,
    shopify_store_url:   body.shopify_store_url   ?? null,
    shopify_embed_code:  body.shopify_embed_code  ?? null,
    embed_mode:          body.embed_mode          || DEFAULT_SETTINGS.embed_mode,
    shopify_shop_domain: body.shopify_shop_domain ?? null,
  };

  const { data, error } = await supabase
    .from("store_settings")
    .upsert(upsertPayload, { onConflict: "organization_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
