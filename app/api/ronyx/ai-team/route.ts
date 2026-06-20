import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ASSISTANT_CATALOG, ASSISTANT_KEYS } from "@/lib/ai/assistantCatalog";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

/**
 * GET /api/ronyx/ai-team
 * Seeds all 12 default assistant records for the org (no-op if already present).
 * Returns merged catalog + org-custom branding for all assistants.
 */
export async function GET() {
  try {
    const sb = createSupabaseServerClient();

    // Fetch existing rows for this org
    const { data: existing, error: fetchErr } = await sb
      .from("organization_ai_assistants")
      .select("*")
      .eq("organization_id", ORG_ID);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const existingKeys = new Set((existing || []).map((r: any) => r.assistant_key));

    // Seed any missing assistants (preserves existing custom settings)
    const missing = ASSISTANT_KEYS.filter(k => !existingKeys.has(k));
    if (missing.length > 0) {
      const seeds = missing.map(key => {
        const catalog = ASSISTANT_CATALOG.find(c => c.assistant_key === key)!;
        return {
          organization_id: ORG_ID,
          assistant_key:   key,
          avatar_style:    catalog.default_avatar_style,
          tone:            "professional",
          is_enabled:      true,
        };
      });

      const { error: seedErr } = await sb
        .from("organization_ai_assistants")
        .insert(seeds);

      if (seedErr && !seedErr.message.includes("duplicate")) {
        return NextResponse.json({ error: seedErr.message }, { status: 500 });
      }
    }

    // Re-fetch all rows after seeding
    const { data: rows, error: refetchErr } = await sb
      .from("organization_ai_assistants")
      .select("*")
      .eq("organization_id", ORG_ID);

    if (refetchErr) return NextResponse.json({ error: refetchErr.message }, { status: 500 });

    const rowMap = new Map<string, any>();
    for (const r of (rows || [])) rowMap.set(r.assistant_key, r);

    // Merge catalog + db rows, preserving catalog order
    const assistants = ASSISTANT_CATALOG.map(catalog => {
      const row = rowMap.get(catalog.assistant_key) || {};
      return {
        id:               row.id            || null,
        assistant_key:    catalog.assistant_key,
        default_name:     catalog.default_name,
        role_title:       catalog.role_title,
        description:      catalog.description,
        filter_category:  catalog.filter_category,
        example_prompt:   catalog.example_prompt,
        custom_name:      row.custom_name   || null,
        display_name:     row.custom_name   || catalog.default_name,
        avatar_style:     row.avatar_style  || catalog.default_avatar_style,
        greeting:         row.greeting      || null,
        tone:             row.tone          || "professional",
        is_enabled:       row.is_enabled !== false,
        updated_at:       row.updated_at    || null,
      };
    });

    return NextResponse.json({ assistants });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
