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

// Accept CSV rows: trip_id(optional), start_time, end_time, truck_id(optional), jurisdiction_code, miles
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

  // Insert trips and segments (simplified): if trip_id missing, create one
  const inserted: any[] = [];
  for (const r of rows) {
    let tripId = r.trip_id;
    if (!tripId) {
      const { data: t, error } = await supabaseAdmin
        .from("eld_trips")
        .insert([
          {
            truck_id: r.truck_id || null,
            start_time: r.start_time,
            end_time: r.end_time,
            total_miles: Number(r.miles || 0),
          },
        ])
        .select("id")
        .single();
      if (error)
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      tripId = t.id;
    }
    const { error: segErr } = await supabaseAdmin
      .from("eld_trip_segments")
      .insert([
        {
          trip_id: tripId,
          jurisdiction_code: r.jurisdiction_code,
          miles: Number(r.miles || 0),
        },
      ]);
    if (segErr)
      return NextResponse.json(
        { ok: false, error: segErr.message },
        { status: 500 },
      );
    inserted.push({ trip_id: tripId, jurisdiction_code: r.jurisdiction_code });
  }

  return NextResponse.json({ ok: true, count: inserted.length });
}
