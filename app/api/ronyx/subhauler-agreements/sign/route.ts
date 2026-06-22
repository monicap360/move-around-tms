import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/ronyx/subhauler-agreements/sign?token=xxx  — fetch agreement by token (public)
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("ronyx_subhauler_agreements")
    .select("*")
    .eq("sign_token", token)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Agreement not found" }, { status: 404 });

  return NextResponse.json({ agreement: data });
}

// POST /api/ronyx/subhauler-agreements/sign — subhauler submits their signature
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.signature) return NextResponse.json({ error: "token and signature required" }, { status: 400 });

  const supabase = supabaseAdmin;

  const { data: existing } = await supabase
    .from("ronyx_subhauler_agreements")
    .select("id, status")
    .eq("sign_token", body.token)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  if (existing.status === "signed" || existing.status === "completed") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("ronyx_subhauler_agreements")
    .update({
      subhauler_sig:        body.signature,
      subhauler_signed_by:  body.signed_by || null,
      subhauler_signed_at:  new Date().toISOString(),
      status:               "signed",
      updated_at:           new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("id, subhauler_name, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, agreement: data });
}
