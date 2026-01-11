// Quote Management Admin API
// Endpoints: GET list, POST create, PATCH update status/fields, DELETE delete

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("aggregate_quotes")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    company,
    contact_name,
    contact_email,
    billing_type,
    rate,
    pay_rate,
    material,
    notes,
    status = "Draft",
  } = body;

  if (!company || !contact_email || !billing_type || rate == null) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: company, contact_email, billing_type, rate",
      },
      { status: 400 },
    );
  }

  const total_profit = (rate || 0) - (pay_rate || 0);

  const { data, error } = await supabaseAdmin
    .from("aggregate_quotes")
    .insert({
      company,
      contact_name,
      contact_email,
      billing_type,
      rate,
      pay_rate,
      material,
      notes,
      status,
      total_profit,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing quote id" }, { status: 400 });
  }

  // Recalculate profit if rates changed
  if (updates.rate !== undefined || updates.pay_rate !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from("aggregate_quotes")
      .select("rate, pay_rate")
      .eq("id", id)
      .single();

    const newRate =
      updates.rate !== undefined ? updates.rate : existing?.rate || 0;
    const newPayRate =
      updates.pay_rate !== undefined
        ? updates.pay_rate
        : existing?.pay_rate || 0;
    updates.total_profit = newRate - newPayRate;
  }

  const { data, error } = await supabaseAdmin
    .from("aggregate_quotes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing quote id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("aggregate_quotes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
