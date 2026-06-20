import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

const VALID_WEBHOOK_EVENTS = [
  "ticket.created","ticket.approved","ticket.rejected","ticket.voided",
  "dispatch.job_created","dispatch.job_assigned","dispatch.job_completed",
  "payroll.run_created","payroll.run_approved","payroll.run_released",
  "billing.invoice_created","billing.invoice_sent","billing.invoice_paid",
  "compliance.block_created","compliance.block_resolved","compliance.expiring",
  "driver.added","driver.updated","truck.added","truck.updated",
  "fastscan.batch_complete","fastscan.needs_review",
];

/** GET /api/ronyx/settings/integrations */
export async function GET() {
  const sb = createSupabaseServerClient();

  const [wh, keys, maps] = await Promise.all([
    sb.from("organization_webhooks")
      .select("id,name,url,events,is_active,last_triggered,last_status,created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false }),
    sb.from("organization_api_keys")
      .select("id,name,key_prefix,scopes,is_active,last_used,expires_at,created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false }),
    sb.from("organization_import_mappings")
      .select("*")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    webhooks:        wh.data   || [],
    api_keys:        keys.data || [],
    import_mappings: maps.data || [],
    available_events: VALID_WEBHOOK_EVENTS,
  });
}

/** POST /api/ronyx/settings/integrations */
export async function POST(req: NextRequest) {
  const body   = await req.json();
  const action = body.action as string;
  const sb     = createSupabaseServerClient();

  /* ── Create webhook ── */
  if (action === "create_webhook") {
    const { name, url, events } = body;
    if (!name || !url) return NextResponse.json({ error: "name and url required." }, { status: 400 });
    if (!url.startsWith("https://")) return NextResponse.json({ error: "Webhook URL must start with https://" }, { status: 400 });
    const bad = (events || []).filter((e: string) => !VALID_WEBHOOK_EVENTS.includes(e));
    if (bad.length) return NextResponse.json({ error: `Unknown events: ${bad.join(", ")}` }, { status: 400 });

    const secret = crypto.randomBytes(24).toString("hex");
    const { data, error } = await sb.from("organization_webhooks").insert({
      organization_id: ORG_ID,
      name,
      url,
      events:      events || [],
      secret_hash: crypto.createHash("sha256").update(secret).digest("hex"),
      is_active:   true,
    }).select("id,name,url,events,is_active,created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ webhook: data, signing_secret: secret }, { status: 201 });
  }

  /* ── Toggle webhook ── */
  if (action === "toggle_webhook") {
    const { id, is_active } = body;
    const { error } = await sb.from("organization_webhooks")
      .update({ is_active: Boolean(is_active), updated_at: new Date().toISOString() })
      .eq("id", id).eq("organization_id", ORG_ID);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  /* ── Delete webhook ── */
  if (action === "delete_webhook") {
    const { id } = body;
    const { error } = await sb.from("organization_webhooks").delete()
      .eq("id", id).eq("organization_id", ORG_ID);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  /* ── Generate API key ── */
  if (action === "create_api_key") {
    const { name, scopes } = body;
    if (!name) return NextResponse.json({ error: "name required." }, { status: 400 });

    const rawKey    = crypto.randomBytes(32).toString("hex");
    const prefix    = "mav_" + crypto.randomBytes(4).toString("hex");
    const key_hash  = crypto.createHash("sha256").update(rawKey).digest("hex");
    const full_key  = `${prefix}_${rawKey}`;

    const { data, error } = await sb.from("organization_api_keys").insert({
      organization_id: ORG_ID,
      name,
      key_prefix:  prefix,
      key_hash,
      scopes:      scopes || [],
      is_active:   true,
    }).select("id,name,key_prefix,scopes,is_active,created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ api_key: data, full_key }, { status: 201 });
  }

  /* ── Revoke API key ── */
  if (action === "revoke_api_key") {
    const { id } = body;
    const { error } = await sb.from("organization_api_keys")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id).eq("organization_id", ORG_ID);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  /* ── Save import mapping ── */
  if (action === "save_import_mapping") {
    const { name, source_type, target_entity, column_map, static_values, transform_rules, is_default, id } = body;
    if (!name || !source_type || !target_entity) return NextResponse.json({ error: "name, source_type, target_entity required." }, { status: 400 });

    if (id) {
      const { data, error } = await sb.from("organization_import_mappings")
        .update({ name, column_map: column_map || {}, static_values: static_values || {}, transform_rules: transform_rules || {}, is_default: Boolean(is_default), last_used: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id).eq("organization_id", ORG_ID).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ mapping: data });
    }

    const { data, error } = await sb.from("organization_import_mappings").insert({
      organization_id: ORG_ID, name, source_type, target_entity,
      column_map:      column_map      || {},
      static_values:   static_values   || {},
      transform_rules: transform_rules || {},
      is_default:      Boolean(is_default),
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ mapping: data }, { status: 201 });
  }

  /* ── Delete import mapping ── */
  if (action === "delete_import_mapping") {
    const { id } = body;
    const { error } = await sb.from("organization_import_mappings").delete()
      .eq("id", id).eq("organization_id", ORG_ID);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
