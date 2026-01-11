import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const from = url.searchParams.get("from"); // YYYY-MM-DD
  const to = url.searchParams.get("to"); // YYYY-MM-DD
  const partnerId = url.searchParams.get("partnerId");
  const status = url.searchParams.get("status");
  const voided = url.searchParams.get("voided"); // 'true' | 'false' | null
  const q = url.searchParams.get("q"); // keyword in ticket_number/material
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "200", 10),
    1000,
  );

  let query = supabaseAdmin
    .from("aggregate_tickets")
    .select(
      `
      id,
      ticket_number,
      ticket_date,
      material,
      quantity,
      unit_type,
      status,
      voided,
      aggregate_partners ( id, name ),
      drivers ( id, name )
    `,
    )
    .order("ticket_date", { ascending: false })
    .limit(limit);

  if (from) query = query.gte("ticket_date", from);
  if (to) query = query.lte("ticket_date", to);
  if (partnerId) query = query.eq("aggregate_partner_id", partnerId);
  if (status) query = query.eq("status", status);
  if (voided === "true") query = query.eq("voided", true);
  if (voided === "false") query = query.eq("voided", false);
  if (q) {
    // Basic OR filter on ticket_number and material
    query = query.or(`ticket_number.ilike.%${q}%,material.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("tickets search error", error);
    return NextResponse.json(
      { ok: false, error: "query_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, items: data || [] });
}
