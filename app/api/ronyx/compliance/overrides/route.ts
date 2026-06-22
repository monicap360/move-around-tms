import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Auto-expire overrides on every read
async function expireStale(sb: typeof supabaseAdmin) {
  await sb
    .from("ronyx_compliance_overrides")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "active")
    .lt("expiration_date", new Date().toISOString().slice(0, 10));
}

export async function GET(req: NextRequest) {
  const sb = supabaseAdmin;
  await expireStale(sb);

  const { searchParams } = new URL(req.url);
  const ooId        = searchParams.get("owner_operator_id");
  const driverId    = searchParams.get("driver_id");
  const customer    = searchParams.get("customer_name");
  const status      = searchParams.get("status") ?? "active";
  const docType     = searchParams.get("document_type");

  let q = sb
    .from("ronyx_compliance_overrides")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status)   q = q.eq("status", status);
  if (ooId)     q = q.eq("owner_operator_id", ooId);
  if (driverId) q = q.eq("driver_id", driverId);
  if (customer) q = q.eq("customer_name", customer);
  if (docType)  q = q.eq("document_type", docType);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ overrides: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  try {
    const body = await req.json();

    const required = ["requirement_type", "document_type", "override_reason", "approved_by_name", "override_type"];
    for (const f of required) {
      if (!body[f]) return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 });
    }

    const ooId       = body.owner_operator_id ?? null;
    const driverId   = body.driver_id          ?? null;
    const docType    = String(body.document_type).slice(0, 60);
    const customer   = body.customer_name       ?? null;

    // Search for an existing active override for this exact entity/document/customer
    // combination before inserting, so we never create duplicate active overrides.
    let matchQuery = sb
      .from("ronyx_compliance_overrides")
      .select("id")
      .eq("status", "active")
      .eq("document_type", docType);

    if (ooId)     matchQuery = matchQuery.eq("owner_operator_id", ooId);
    else          matchQuery = matchQuery.is("owner_operator_id", null);

    if (driverId) matchQuery = matchQuery.eq("driver_id", driverId);
    else          matchQuery = matchQuery.is("driver_id", null);

    if (customer) matchQuery = matchQuery.eq("customer_name", customer);
    else          matchQuery = matchQuery.is("customer_name", null);

    const { data: existing } = await matchQuery.maybeSingle();

    const fields = {
      organization_id:     body.organization_id    ?? null,
      owner_operator_id:   ooId,
      owner_operator_name: body.owner_operator_name ?? null,
      driver_id:           driverId,
      driver_name:         body.driver_name          ?? null,
      customer_name:       customer,
      project_name:        body.project_name          ?? null,
      requirement_type:    String(body.requirement_type).slice(0, 60),
      document_type:       docType,
      requirement_key:     body.requirement_key       ?? docType,
      override_type:       body.override_type,
      override_reason:     String(body.override_reason).slice(0, 500),
      approved_by_name:    String(body.approved_by_name).slice(0, 120),
      approved_at:         new Date().toISOString(),
      expiration_date:     body.expiration_date ?? null,
      status:              "active",
      notes:               body.notes ?? null,
      updated_at:          new Date().toISOString(),
    };

    let data: any;
    let error: any;

    if (existing?.id) {
      // Update the existing active override — no duplicate created
      ({ data, error } = await sb
        .from("ronyx_compliance_overrides")
        .update(fields)
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      // No active override exists — safe to insert
      ({ data, error } = await sb
        .from("ronyx_compliance_overrides")
        .insert(fields)
        .select()
        .single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-create staff task for override expiring within 7 days
    if (body.expiration_date) {
      const days = Math.ceil((new Date(body.expiration_date).getTime() - Date.now()) / 86_400_000);
      if (days <= 7) {
        await sb.from("ronyx_staff_tasks").insert({
          task_type:        "compliance_override_expiring",
          title:            `Override expiring in ${days}d — ${docType}`,
          description:      `Override for ${docType} expires on ${body.expiration_date}. Approved by ${body.approved_by_name}.`,
          priority:         days <= 2 ? "critical" : "high",
          assigned_to_name: "Sylvia / Compliance Admin",
          entity_type:      ooId ? "oo" : "driver",
          entity_id:        ooId ?? driverId ?? null,
          status:           "open",
        });
      }
    }

    return NextResponse.json({ override: data, ok: true, updated: !!existing?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const sb = supabaseAdmin;
  try {
    const body = await req.json();
    const { id, action, revoked_by_name, revoke_reason } = body;
    if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

    if (action === "revoke") {
      const { error } = await sb
        .from("ronyx_compliance_overrides")
        .update({ status: "revoked", revoked_by_name, revoke_reason, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
