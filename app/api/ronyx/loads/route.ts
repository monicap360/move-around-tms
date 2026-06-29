import { NextResponse } from "next/server";

import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const DEFAULT_LOADS = [
  {
    load_number: "LD-6121",
    route: "Pit 7 → I‑45 Jobsite",
    status: "active",
    driver_name: "D. Perez",
    customer_name: "Metro Paving",
  },
  {
    load_number: "LD-6124",
    route: "Pit 3 → Beltway 8",
    status: "active",
    driver_name: "S. Grant",
    customer_name: "Gulf Aggregate",
  },
  {
    load_number: "LD-6129",
    route: "Pit 5 → Katy Site",
    status: "completed",
    driver_name: "J. Lane",
    customer_name: "City Site",
  },
  {
    load_number: "LD-6202",
    route: "Pit 2 → Downtown",
    status: "available",
    driver_name: "",
    customer_name: "Metro Paving",
  },
  {
    load_number: "LD-6204",
    route: "Pit 8 → Loop 610",
    status: "cancelled",
    driver_name: "S. Grant",
    customer_name: "Gulf Aggregate",
  },
];

export async function GET(request: Request) {
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const driverName = searchParams.get("driver_name");
  const id = searchParams.get("id");

  // Single-load lookup (used by the load detail page). Returns { load }.
  if (id) {
    const { data, error } = await supabase
      .from("ronyx_loads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Load not found" }, { status: 404 });
    return NextResponse.json({ load: data });
  }

  let query = supabase
    .from("ronyx_loads")
    .select("*")
    .or(orgId ? `organization_id.eq.${orgId},organization_id.is.null` : `id.not.is.null`)
    .order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }
  if (driverName) {
    query = query.ilike("driver_name", driverName);
  }
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0) {
    const seededRows = DEFAULT_LOADS.map(r => ({ ...r, organization_id: orgId }));
    const { error: insertError } = await supabase.from("ronyx_loads").insert(seededRows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_loads")
      .select("*")
      .or(orgId ? `organization_id.eq.${orgId},organization_id.is.null` : `id.not.is.null`)
      .order("created_at", { ascending: false });
    return NextResponse.json({ loads: seeded || [] });
  }

  return NextResponse.json({ loads: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId();
  const route =
    payload?.route ||
    (payload?.pickup_location && payload?.delivery_location
      ? `${payload.pickup_location} → ${payload.delivery_location}`
      : payload?.route);

  const { data, error } = await supabase
    .from("ronyx_loads")
    .insert({ ...payload, route, organization_id: orgId })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ load: data });
}

// Insert/update that tolerates schema drift across environments: if Postgres reports
// an unknown column, drop that key and retry. Returns { data } or { error }.
async function stripAndRetry(
  run: (payload: Record<string, any>) => PromiseLike<{ data: any; error: any }>,
  payload: Record<string, any>,
): Promise<{ data?: any; error?: any }> {
  const p: Record<string, any> = { ...payload };
  for (let i = 0; i < 20; i++) {
    const { data, error } = await run(p);
    if (!error) return { data };
    const m = /Could not find the '(.+?)' column/.exec(error?.message || "");
    if (m && Object.prototype.hasOwnProperty.call(p, m[1])) { delete p[m[1]]; continue; }
    return { error };
  }
  return { error: { message: "schema drift: too many unknown columns" } };
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const { id, action, create_ticket, ...updates } = payload || {};

  if (!id) {
    return NextResponse.json({ error: "Missing load id" }, { status: 400 });
  }

  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId();
  const now = new Date().toISOString();
  const resolvedUpdates = { ...updates };

  if (action === "start") {
    resolvedUpdates.status = "active";
    resolvedUpdates.started_at = now;
  }
  if (action === "complete") {
    resolvedUpdates.status = "completed";
    resolvedUpdates.completed_at = now;
  }

  let ticketId: string | null = resolvedUpdates.ticket_id || null;
  if (action === "complete" && create_ticket !== false && !ticketId) {
    const { data: existing } = await supabase.from("ronyx_loads").select("*").eq("id", id).single();
    if (existing) {
      const ticketPayload = {
        organization_id: orgId,
        ticket_number: existing.load_number,
        ticket_date: new Date().toISOString().slice(0, 10),
        driver_name: existing.driver_name,
        truck_number: existing.truck_number,
        material: existing.material,
        unit_type: existing.unit_type || "Load",
        quantity: existing.quantity || 1,
        bill_rate: existing.rate_amount || existing.rate || null,
        rate_type: existing.rate_type || existing.unit_type || "Load",
        customer_name: existing.customer_name,
        job_name: existing.job_site,
        pickup_location: existing.pickup_location,
        delivery_location: existing.delivery_location,
        status: "approved",
        payment_status: "unpaid",
        ticket_notes: existing.status_notes || existing.notes,
        pod_url: existing.pod_url,
        digital_signature: updates?.digital_signature || null,
        signature_name: updates?.signature_name || null,
        signed_at: updates?.signed_at || null,
      };

      // aggregate_tickets schema drifts across envs — drop unknown columns and retry
      // so the completion → ticket handoff lands instead of 500-ing. Best-effort: if
      // the ticket truly can't be created, completion still proceeds below.
      const { data: ticket } = await stripAndRetry(
        (p) => supabase.from("aggregate_tickets").insert(p).select("*").single(),
        ticketPayload,
      );
      if (ticket?.id) { ticketId = ticket.id; resolvedUpdates.ticket_id = ticketId; }
    }
  }

  // ronyx_loads is a read-only VIEW over the base `loads` table (same ids); writes
  // must go to the base table or Postgres rejects them ("cannot update view").
  // Strip unknown columns (started_at/completed_at/ticket_id may not exist) so the
  // status always advances rather than failing on schema drift.
  const { data, error } = await stripAndRetry(
    (p) => supabase.from("loads").update({ ...p, updated_at: now }).eq("id", id).select("*").single(),
    resolvedUpdates,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ load: data, ticket_id: ticketId });
}
