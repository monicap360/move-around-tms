import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_subhauler_agreements")
    .select("id, subhauler_name, subhauler_email, status, sign_token, sent_at, created_at, prime_carrier_signed_at, subhauler_signed_at, general_contractor, project_name")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agreements: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => null);
  if (!body?.subhauler_name) return NextResponse.json({ error: "subhauler_name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ronyx_subhauler_agreements")
    .insert({
      subhauler_name:      body.subhauler_name,
      subhauler_address:   body.subhauler_address   || null,
      subhauler_attn:      body.subhauler_attn       || null,
      subhauler_phone:     body.subhauler_phone      || null,
      subhauler_email:     body.subhauler_email      || null,
      subhauler_usdot:     body.subhauler_usdot      || null,
      trucks:              body.trucks               || [],
      commencement_day:    body.commencement_day     || null,
      commencement_month:  body.commencement_month   || null,
      commencement_year:   body.commencement_year    || null,
      completion_day:      body.completion_day       || null,
      completion_month:    body.completion_month     || null,
      completion_year:     body.completion_year      || null,
      general_contractor:  body.general_contractor   || null,
      gc_address:          body.gc_address           || null,
      project_name:        body.project_name         || null,
      prime_carrier_sig:   body.prime_carrier_sig    || null,
      prime_carrier_signed_by: body.prime_carrier_signed_by || null,
      prime_carrier_signed_at: body.prime_carrier_sig ? new Date().toISOString() : null,
      status:              body.prime_carrier_sig ? "awaiting_subhauler" : "draft",
      created_by:          body.created_by           || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agreement: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...rest } = body;

  // If subhauler just signed, mark completed
  if (rest.subhauler_sig && !rest.status) {
    rest.status = "signed";
    rest.subhauler_signed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("ronyx_subhauler_agreements")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agreement: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("ronyx_subhauler_agreements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
