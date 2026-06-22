import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("ronyx_ach_authorizations")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Authorization not found" }, { status: 404 });

  return NextResponse.json({ authorization: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.signature) return NextResponse.json({ error: "token and signature required" }, { status: 400 });

  const supabase = supabaseAdmin;
  const { data: existing } = await supabase
    .from("ronyx_ach_authorizations")
    .select("id, status")
    .eq("sign_token", body.token)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "signed") return NextResponse.json({ error: "Already signed" }, { status: 409 });

  const { data, error } = await supabase
    .from("ronyx_ach_authorizations")
    .update({
      signature:    body.signature,
      signed_name:  body.signed_name  || null,
      signed_title: body.signed_title || null,
      signed_at:    new Date().toISOString(),
      status:       "signed",
      updated_at:   new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("id, recipient_name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, authorization: data });
}
