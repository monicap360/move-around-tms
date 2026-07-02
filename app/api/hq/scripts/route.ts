import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ — sales scripts & training content for reps.
const FIELDS = ["title", "category", "content", "sort_order"] as const;
const clean = (b: any) => {
  const row: Record<string, unknown> = {};
  for (const f of FIELDS) { if (!(f in b)) continue; let v = b[f]; if (v === "") v = f === "sort_order" ? 0 : null; row[f] = v; }
  return row;
};

export async function GET() {
  const { data, error } = await supabaseAdmin.from("hq_sales_scripts").select("*").order("sort_order").order("created_at");
  if (error) return NextResponse.json({ scripts: [], error: error.message });
  return NextResponse.json({ scripts: data || [] });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("hq_sales_scripts").insert(clean(b)).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, script: data });
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("hq_sales_scripts").update({ ...clean(b), updated_at: new Date().toISOString() }).eq("id", b.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, script: data });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id") || (await req.json().catch(() => ({}))).id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("hq_sales_scripts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
