import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { ASSISTANT_CATALOG, ASSISTANT_KEYS } from "@/lib/ai/assistantCatalog";

export const dynamic = "force-dynamic";

async function resolveOrgId(req: NextRequest): Promise<string | null> {
  const sb = createSupabaseServerClient();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;

  const { data: seat } = await supabaseAdmin
    .from("user_seats")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  return seat?.organization_id ?? null;
}

/**
 * GET /api/ronyx/ai-team
 * Seeds all 12 default assistant records for the org (no-op if already present).
 * Returns merged catalog + org-custom branding for all assistants.
 */
export async function GET(req: NextRequest) {
  try {
    const orgId = await resolveOrgId(req);
    if (!orgId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("organization_ai_assistants")
      .select("*")
      .eq("organization_id", orgId);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const existingKeys = new Set((existing || []).map((r: any) => r.assistant_key));

    const missing = ASSISTANT_KEYS.filter(k => !existingKeys.has(k));
    if (missing.length > 0) {
      const seeds = missing.map(key => {
        const catalog = ASSISTANT_CATALOG.find(c => c.assistant_key === key)!;
        return {
          organization_id: orgId,
          assistant_key:   key,
          avatar_style:    catalog.default_avatar_style,
          tone:            "professional",
          is_enabled:      true,
        };
      });

      const { error: seedErr } = await supabaseAdmin
        .from("organization_ai_assistants")
        .insert(seeds);

      if (seedErr && !seedErr.message.includes("duplicate")) {
        return NextResponse.json({ error: seedErr.message }, { status: 500 });
      }
    }

    const { data: rows, error: refetchErr } = await supabaseAdmin
      .from("organization_ai_assistants")
      .select("*")
      .eq("organization_id", orgId);

    if (refetchErr) return NextResponse.json({ error: refetchErr.message }, { status: 500 });

    const rowMap = new Map<string, any>();
    for (const r of (rows || [])) rowMap.set(r.assistant_key, r);

    const assistants = ASSISTANT_CATALOG.map(catalog => {
      const row = rowMap.get(catalog.assistant_key) || {};
      return {
        id:              row.id            || null,
        assistant_key:   catalog.assistant_key,
        default_name:    catalog.default_name,
        role_title:      catalog.role_title,
        description:     catalog.description,
        filter_category: catalog.filter_category,
        example_prompt:  catalog.example_prompt,
        custom_name:     row.custom_name   || null,
        display_name:    row.custom_name   || catalog.default_name,
        avatar_style:    row.avatar_style  || catalog.default_avatar_style,
        greeting:        row.greeting      || null,
        tone:            row.tone          || "professional",
        is_enabled:      row.is_enabled !== false,
        updated_at:      row.updated_at    || null,
      };
    });

    return NextResponse.json({ assistants });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
