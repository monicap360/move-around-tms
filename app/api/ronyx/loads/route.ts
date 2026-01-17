import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const driverName = searchParams.get("driver_name");

  let query = supabase.from("ronyx_loads").select("*").order("created_at", { ascending: false });
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
    const { error: insertError } = await supabase.from("ronyx_loads").insert(DEFAULT_LOADS);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_loads")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json({ loads: seeded || [] });
  }

  return NextResponse.json({ loads: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();
  const route =
    payload?.route ||
    (payload?.pickup_location && payload?.delivery_location
      ? `${payload.pickup_location} → ${payload.delivery_location}`
      : payload?.route);

  const { data, error } = await supabase
    .from("ronyx_loads")
    .insert({ ...payload, route })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ load: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const { id, action, create_ticket, ...updates } = payload || {};

  if (!id) {
    return NextResponse.json({ error: "Missing load id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
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
        ticket_number: existing.load_number,
        ticket_date: new Date().toISOString().slice(0, 10),
        driver_name: existing.driver_name,
        truck_number: existing.truck_number,
        material: existing.material,
        unit_type: existing.unit_type || "Load",
        quantity: existing.quantity || 1,
        bill_rate: existing.rate_amount || null,
        rate_type: existing.rate_type || existing.unit_type || "Load",
        customer_name: existing.customer_name,
        job_name: existing.job_site,
        pickup_location: existing.pickup_location,
        delivery_location: existing.delivery_location,
        status: "approved",
        payment_status: "unpaid",
        ticket_notes: existing.status_notes,
        pod_url: existing.pod_url,
        digital_signature: updates?.digital_signature || null,
        signature_name: updates?.signature_name || null,
        signed_at: updates?.signed_at || null,
      };

      const { data: ticket, error: ticketError } = await supabase
        .from("aggregate_tickets")
        .insert(ticketPayload)
        .select("*")
        .single();
      if (ticketError) {
        return NextResponse.json({ error: ticketError.message }, { status: 500 });
      }
      ticketId = ticket?.id || null;
      resolvedUpdates.ticket_id = ticketId;
    }
  }

  const { data, error } = await supabase
    .from("ronyx_loads")
    .update({ ...resolvedUpdates, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ load: data, ticket_id: ticketId });
}
