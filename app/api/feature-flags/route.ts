import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const scope = searchParams.get("scope") || "global";

  const supabase = createSupabaseServerClient();

  if (key) {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled, description, scope")
      .eq("key", key)
      .eq("scope", scope)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flag: data || null });
  }

  const { data, error } = await supabase.from("feature_flags").select("key, enabled, description, scope");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flags: data || [] });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const key = payload?.key;
  const enabled = payload?.enabled;
  const scope = payload?.scope || "global";

  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing key or enabled" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .upsert(
      {
        key,
        enabled,
        description: payload?.description || null,
        scope,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key,scope" },
    )
    .select("key, enabled, description, scope")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flag: data });
}
