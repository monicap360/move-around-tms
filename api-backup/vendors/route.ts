import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/security";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  let query = supabaseAdmin
    .from("vendors")
    .select("*")
    .order("name", { ascending: true });
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendors: data });
}

export async function POST(req: NextRequest) {
  if (!requireSameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .insert(body)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendor: data });
}

export async function PATCH(req: NextRequest) {
  if (!requireSameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const id = body?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("vendors")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendor: data });
}

export async function DELETE(req: NextRequest) {
  if (!requireSameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabaseAdmin.from("vendors").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
