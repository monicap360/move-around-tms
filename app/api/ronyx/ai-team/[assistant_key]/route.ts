import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { ASSISTANT_CATALOG, ASSISTANT_KEYS } from "@/lib/ai/assistantCatalog";

export const dynamic = "force-dynamic";

const VALID_TONE  = ["professional","friendly","direct","upbeat","concise"] as const;
const VALID_STYLE = ["default","command","logistics","finance","compliance","fleet","people","analytics"] as const;
const ADMIN_ROLES = ["owner","admin","system_admin"];

async function resolveSession(req: NextRequest) {
  const sb = supabaseAdmin;
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

/**
 * PATCH /api/ronyx/ai-team/[assistant_key]
 * Update custom branding for one assistant.
 * Body: { custom_name?, avatar_style?, greeting?, tone?, is_enabled? }
 * Body: { action: "reset" } — clears all custom fields, restores defaults
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ assistant_key: string }> }) {
  const params = await props.params;
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!ADMIN_ROLES.includes(session.role))
      return NextResponse.json({ error: "Only Owner or Admin can customize AI assistants." }, { status: 403 });

    const key = params.assistant_key;
    if (!ASSISTANT_KEYS.includes(key as any))
      return NextResponse.json({ error: `Unknown assistant key: ${key}` }, { status: 400 });

    const { orgId, user } = session;
    const body = await req.json();

    if (body.action === "reset") {
      const { error } = await supabaseAdmin
        .from("organization_ai_assistants")
        .update({
          custom_name:  null,
          greeting:     null,
          tone:         "professional",
          is_enabled:   true,
          avatar_style: ASSISTANT_CATALOG.find(c => c.assistant_key === key)?.default_avatar_style || "default",
        })
        .eq("organization_id", orgId)
        .eq("assistant_key",   key);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      void supabaseAdmin.from("platform_admin_audit_log").insert({
        actor_id:    user.id,
        actor_email: user.email,
        org_id:      orgId,
        event_type:  "ai_assistant.reset",
        details:     { assistant_key: key },
      });

      return NextResponse.json({ success: true, action: "reset" });
    }

    const patch: Record<string, unknown> = {};

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

    if (Object.keys(patch).length === 0)
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });

    const { data: before } = await supabaseAdmin
      .from("organization_ai_assistants")
      .select("custom_name, avatar_style, greeting, tone, is_enabled")
      .eq("organization_id", orgId)
      .eq("assistant_key",   key)
      .single();

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("organization_ai_assistants")
      .update(patch)
      .eq("organization_id", orgId)
      .eq("assistant_key",   key)
      .select("*")
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    void supabaseAdmin.from("platform_admin_audit_log").insert({
      actor_id:    user.id,
      actor_email: user.email,
      org_id:      orgId,
      event_type:  "ai_assistant.updated",
      details:     { assistant_key: key, before: before || {}, after: patch },
    });

    return NextResponse.json({ success: true, assistant: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
