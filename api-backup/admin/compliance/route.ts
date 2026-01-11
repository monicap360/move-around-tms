import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401 },
  );
}
function check(req: NextRequest) {
  const t = req.headers.get("authorization") || "";
  const e = process.env.ADMIN_TOKEN;
  return e && t === `Bearer ${e}`;
}

export async function GET(req: NextRequest) {
  if (!check(req)) return unauthorized();
  const url = new URL(req.url);
  const upcomingDays = Number(url.searchParams.get("upcoming_days") || 60);
  const until = new Date(Date.now() + upcomingDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("compliance_items")
    .select("*")
    .lte("expiration_date", until)
    .order("expiration_date", { ascending: true });
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: NextRequest) {
  if (!check(req)) return unauthorized();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin
    .from("compliance_items")
    .insert([body])
    .select("*")
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(req: NextRequest) {
  if (!check(req)) return unauthorized();
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const { id, ...updates } = body;
  if (!id)
    return NextResponse.json(
      { ok: false, error: "missing_id" },
      { status: 400 },
    );
  const { data, error } = await supabaseAdmin
    .from("compliance_items")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, item: data });
}
