import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const VALID_WEBHOOK_EVENTS = [
  "ticket.created","ticket.approved","ticket.rejected","ticket.voided",
  "dispatch.job_created","dispatch.job_assigned","dispatch.job_completed",
  "payroll.run_created","payroll.run_approved","payroll.run_released",
  "billing.invoice_created","billing.invoice_sent","billing.invoice_paid",
  "compliance.block_created","compliance.block_resolved","compliance.expiring",
  "driver.added","driver.updated","truck.added","truck.updated",
  "fastscan.batch_complete","fastscan.needs_review",
];

const ADMIN_ROLES = ["owner","admin","system_admin","integration_admin"];

/** Resolve the calling user's org and role. Returns null on auth failure. */
async function resolveSession(req: NextRequest) {
  const sb = createSupabaseServerClient();
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

/** GET /api/ronyx/settings/integrations */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { orgId } = session;

  const [wh, keys, maps] = await Promise.all([
    supabaseAdmin
      .from("organization_webhooks")
      .select("id,name,url,events,is_active,last_triggered,last_status,created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("organization_api_keys")
      .select("id,name,key_prefix,scopes,is_active,last_used_at,expires_at,created_at")
      .eq("organization_id", orgId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("organization_import_mappings")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    webhooks:         wh.data   || [],
    api_keys:         keys.data || [],
    import_mappings:  maps.data || [],
    available_events: VALID_WEBHOOK_EVENTS,
    is_admin:         ADMIN_ROLES.includes(session.role),
  });
}

/** POST /api/ronyx/settings/integrations */
export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body   = await req.json();
  const action = body.action as string;
  const { orgId, role, user } = session;

  const isAdmin = ADMIN_ROLES.includes(role);
  const writingActions = ["create_webhook","toggle_webhook","delete_webhook","create_api_key","revoke_api_key","save_import_mapping","delete_import_mapping"];

  if (writingActions.includes(action) && !isAdmin) {
    return NextResponse.json({ error: "Only Owner, Admin, or Integration Admin can manage integrations." }, { status: 403 });
  }

  function auditLog(eventType: string, details: Record<string, unknown>) {
    void supabaseAdmin.from("platform_admin_audit_log").insert({
      actor_id:    user.id,
      actor_email: user.email,
      org_id:      orgId,
      event_type:  eventType,
      details,
    });
  }

  /* ── Create webhook ── */
  if (action === "create_webhook") {
    const { name, url, events } = body;
    if (!name || !url) return NextResponse.json({ error: "name and url required." }, { status: 400 });
    if (!url.startsWith("https://")) return NextResponse.json({ error: "Webhook URL must start with https://" }, { status: 400 });
    const bad = (events || []).filter((e: string) => !VALID_WEBHOOK_EVENTS.includes(e));
    if (bad.length) return NextResponse.json({ error: `Unknown events: ${bad.join(", ")}` }, { status: 400 });

    const secret = crypto.randomBytes(24).toString("hex");
    const { data, error } = await supabaseAdmin.from("organization_webhooks").insert({
      organization_id: orgId,
      name,
      url,
      events:      events || [],
      secret_hash: crypto.createHash("sha256").update(secret).digest("hex"),
      is_active:   true,
    }).select("id,name,url,events,is_active,created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("webhook.created", { webhook_id: data.id, name, url, events });
    return NextResponse.json({ webhook: data, signing_secret: secret }, { status: 201 });
  }

  /* ── Toggle webhook ── */
  if (action === "toggle_webhook") {
    const { id, is_active } = body;
    const { error } = await supabaseAdmin.from("organization_webhooks")
      .update({ is_active: Boolean(is_active) })
      .eq("id", id).eq("organization_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("webhook.toggled", { webhook_id: id, is_active });
    return NextResponse.json({ success: true });
  }

  /* ── Delete webhook ── */
  if (action === "delete_webhook") {
    const { id } = body;
    const { data: wh } = await supabaseAdmin.from("organization_webhooks")
      .select("name").eq("id", id).eq("organization_id", orgId).maybeSingle();
    const { error } = await supabaseAdmin.from("organization_webhooks").delete()
      .eq("id", id).eq("organization_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("webhook.deleted", { webhook_id: id, name: wh?.name });
    return NextResponse.json({ success: true });
  }

  /* ── Generate API key ── */
  if (action === "create_api_key") {
    const { name, scopes, expires_in_days } = body;
    if (!name) return NextResponse.json({ error: "name required." }, { status: 400 });

    const rawKey   = crypto.randomBytes(32).toString("hex");
    const prefix   = "mav_" + crypto.randomBytes(4).toString("hex");
    const key_hash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const full_key = `${prefix}_${rawKey}`;
    const expires_at = expires_in_days
      ? new Date(Date.now() + Number(expires_in_days) * 86400000).toISOString()
      : null;

    const { data, error } = await supabaseAdmin.from("organization_api_keys").insert({
      organization_id: orgId,
      name,
      key_prefix:  prefix,
      key_hash,
      scopes:      scopes || [],
      is_active:   true,
      expires_at,
    }).select("id,name,key_prefix,scopes,expires_at,created_at").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("api_key.created", { key_id: data.id, name, scopes, expires_at });

    // full_key is returned ONCE here and never again — only key_hash is stored
    return NextResponse.json({ api_key: data, full_key }, { status: 201 });
  }

  /* ── Revoke API key ── */
  if (action === "revoke_api_key") {
    const { id } = body;
    const { data: k } = await supabaseAdmin.from("organization_api_keys")
      .select("name").eq("id", id).eq("organization_id", orgId).maybeSingle();
    const { error } = await supabaseAdmin.from("organization_api_keys")
      .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: user.email })
      .eq("id", id).eq("organization_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("api_key.revoked", { key_id: id, name: k?.name, revoked_by: user.email });
    return NextResponse.json({ success: true });
  }

  /* ── Save import mapping ── */
  if (action === "save_import_mapping") {
    const { name, source_type, target_entity, column_map, static_values, transform_rules, is_default, id } = body;
    if (!name || !source_type || !target_entity)
      return NextResponse.json({ error: "name, source_type, target_entity required." }, { status: 400 });

    if (id) {
      const { data, error } = await supabaseAdmin.from("organization_import_mappings")
        .update({ name, column_map: column_map || {}, static_values: static_values || {}, transform_rules: transform_rules || {}, is_default: Boolean(is_default) })
        .eq("id", id).eq("organization_id", orgId).select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await auditLog("import_mapping.updated", { mapping_id: id, name });
      return NextResponse.json({ mapping: data });
    }

    const { data, error } = await supabaseAdmin.from("organization_import_mappings").insert({
      organization_id: orgId, name, source_type, target_entity,
      column_map:      column_map      || {},
      static_values:   static_values   || {},
      transform_rules: transform_rules || {},
      is_default:      Boolean(is_default),
    }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("import_mapping.created", { mapping_id: data.id, name, source_type, target_entity });
    return NextResponse.json({ mapping: data }, { status: 201 });
  }

  /* ── Delete import mapping ── */
  if (action === "delete_import_mapping") {
    const { id } = body;
    const { data: m } = await supabaseAdmin.from("organization_import_mappings")
      .select("name").eq("id", id).eq("organization_id", orgId).maybeSingle();
    const { error } = await supabaseAdmin.from("organization_import_mappings").delete()
      .eq("id", id).eq("organization_id", orgId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("import_mapping.deleted", { mapping_id: id, name: m?.name });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
