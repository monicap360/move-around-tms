import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_ach_authorizations")
    .select("id, recipient_name, company_name, email, status, sign_token, sent_at, signed_at, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ authorizations: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => null);
  if (!body?.recipient_name) return NextResponse.json({ error: "recipient_name required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ronyx_ach_authorizations")
    .insert({
      recipient_name: body.recipient_name,
      company_name:   body.company_name  || null,
      email:          body.email         || null,
      created_by:     body.created_by    || null,
      status:         "draft",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ authorization: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...rest } = body;
  const { data, error } = await supabase
    .from("ronyx_ach_authorizations")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ authorization: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("ronyx_ach_authorizations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
