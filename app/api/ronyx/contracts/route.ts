import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("ronyx_contracts")
    .select("*")
    .order("company_name", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contracts: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin;
  const payload = await request.json().catch(() => null);
  if (!payload?.company_name) {
    return NextResponse.json({ error: "company_name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ronyx_contracts")
    .insert({
      company_name:   payload.company_name,
      customer_id:    payload.customer_id    || null,
      contract_type:  payload.contract_type  || "hauling",
      status:         payload.status         || "active",
      start_date:     payload.start_date     || null,
      end_date:       payload.end_date       || null,
      rate_type:      payload.rate_type      || "per_ton",
      rate_amount:    payload.rate_amount    ? Number(payload.rate_amount) : null,
      material_type:  payload.material_type  || null,
      contact_name:   payload.contact_name   || null,
      contact_email:  payload.contact_email  || null,
      contact_phone:  payload.contact_phone  || null,
      notes:          payload.notes          || null,
      signed_date:    payload.signed_date    || null,
      signed_by:      payload.signed_by      || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = supabaseAdmin;
  const payload = await request.json().catch(() => null);
  if (!payload?.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { id, ...rest } = payload;
  const { data, error } = await supabase
    .from("ronyx_contracts")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = supabaseAdmin;
  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase.from("ronyx_contracts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
