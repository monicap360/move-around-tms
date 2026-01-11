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
  const year = url.searchParams.get("year");
  const quarter = url.searchParams.get("quarter");
  let q = supabaseAdmin.from("ifta_quarter_filings").select("*");
  if (year) q = q.eq("year", Number(year));
  if (quarter) q = q.eq("quarter", Number(quarter));
  const { data, error } = await q.order("prepared_at", { ascending: false });
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
  const { year, quarter, status, summary_json, pdf_url } = body;
  const { data, error } = await supabaseAdmin
    .from("ifta_quarter_filings")
    .insert([
      { year, quarter, status: status || "Draft", summary_json, pdf_url },
    ])
    .select("*")
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, item: data });
}
