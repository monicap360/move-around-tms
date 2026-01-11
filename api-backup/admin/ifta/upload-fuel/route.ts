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

// Accept CSV rows: purchase_date, jurisdiction_code, truck_id(optional), vendor(optional), gallons, amount
export async function POST(req: NextRequest) {
  if (!check(req)) return unauthorized();
  const contentType = req.headers.get("content-type") || "";
  let rows: any[] = [];
  if (contentType.includes("application/json")) {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 },
      );
    }
    rows = Array.isArray(body) ? body : body.rows;
  } else {
    const text = await req.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines.shift()?.split(",") || [];
    for (const line of lines) {
      const cols = line.split(",");
      const obj: any = {};
      header.forEach((h, i) => (obj[h.trim()] = cols[i]?.trim()));
      rows.push(obj);
    }
  }

  const payload = rows.map((r) => ({
    purchase_date: r.purchase_date,
    jurisdiction_code: r.jurisdiction_code,
    truck_id: r.truck_id || null,
    vendor: r.vendor || null,
    gallons: Number(r.gallons || 0),
    amount: Number(r.amount || 0),
  }));

  const { error } = await supabaseAdmin.from("fuel_purchases").insert(payload);
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, count: payload.length });
}
