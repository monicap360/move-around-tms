import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ASSISTANT_CATALOG, ASSISTANT_KEYS } from "@/lib/ai/assistantCatalog";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

const VALID_TONE   = ["professional", "friendly", "direct", "upbeat", "concise"] as const;
const VALID_STYLE  = ["default", "command", "logistics", "finance", "compliance", "fleet", "people", "analytics"] as const;

/**
 * PATCH /api/ronyx/ai-team/[assistant_key]
 * Update custom branding for one assistant.
 * Body: { custom_name?, avatar_style?, greeting?, tone?, is_enabled? }
 * Body: { action: "reset" } — clears all custom fields, restores defaults
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { assistant_key: string } },
) {
  try {
    const key = params.assistant_key;
    if (!ASSISTANT_KEYS.includes(key as any)) {
      return NextResponse.json({ error: `Unknown assistant key: ${key}` }, { status: 400 });
    }

    const sb   = createSupabaseServerClient();
    const body = await req.json();

    // Reset path: clear all custom fields
    if (body.action === "reset") {
      const { error } = await sb
        .from("organization_ai_assistants")
        .update({
          custom_name:  null,
          greeting:     null,
          tone:         "professional",
          is_enabled:   true,
          avatar_style: ASSISTANT_CATALOG.find(c => c.assistant_key === key)?.default_avatar_style || "default",
          updated_at:   new Date().toISOString(),
        })
        .eq("organization_id", ORG_ID)
        .eq("assistant_key",   key);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await logAssistantAudit(sb, { key, action: "reset", metadata: {} });
      return NextResponse.json({ success: true, action: "reset" });
    }

    // Validate fields
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };

    if ("custom_name" in body) {
      const name = body.custom_name === null ? null : String(body.custom_name || "").trim();
      if (name && name.length > 30) return NextResponse.json({ error: "Name must be 30 characters or fewer." }, { status: 400 });
      patch.custom_name = name || null;
    }
    if ("greeting" in body) {
      const gr = body.greeting === null ? null : String(body.greeting || "").trim();
      if (gr && gr.length > 180) return NextResponse.json({ error: "Greeting must be 180 characters or fewer." }, { status: 400 });
      patch.greeting = gr || null;
    }
    if ("tone" in body) {
      if (!VALID_TONE.includes(body.tone)) return NextResponse.json({ error: `Invalid tone: ${body.tone}` }, { status: 400 });
      patch.tone = body.tone;
    }
    if ("avatar_style" in body) {
      if (!VALID_STYLE.includes(body.avatar_style)) return NextResponse.json({ error: `Invalid avatar_style: ${body.avatar_style}` }, { status: 400 });
      patch.avatar_style = body.avatar_style;
    }
    if ("is_enabled" in body) {
      patch.is_enabled = Boolean(body.is_enabled);
    }

    if (Object.keys(patch).length <= 1) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Get current value for audit before/after
    const { data: before } = await sb
      .from("organization_ai_assistants")
      .select("custom_name, avatar_style, greeting, tone, is_enabled")
      .eq("organization_id", ORG_ID)
      .eq("assistant_key",   key)
      .single();

    const { data: updated, error: updateErr } = await sb
      .from("organization_ai_assistants")
      .update(patch)
      .eq("organization_id", ORG_ID)
      .eq("assistant_key",   key)
      .select("*")
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await logAssistantAudit(sb, {
      key,
      action: "update",
      metadata: { before: before || {}, after: patch },
    });

    return NextResponse.json({ success: true, assistant: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}

async function logAssistantAudit(
  sb: ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>,
  opts: { key: string; action: string; metadata: Record<string, any> },
) {
  try {
    // Use ticket_audit_log or platform_admin_audit_log as fallback — both exist in this project.
    // We write to platform_admin_audit_log since this is a settings-level change.
    await sb.from("platform_admin_audit_log").insert({
      admin_user_id:  "00000000-0000-0000-0000-000000000000",
      admin_email:    "system",
      action:         `ai_assistant_${opts.action}`,
      target_org_id:  ORG_ID,
      target_entity:  "organization_ai_assistants",
      target_id:      opts.key,
      metadata:       { assistant_key: opts.key, ...opts.metadata },
    });
  } catch {
    // Non-fatal — audit logging should never break the main operation
  }
}
