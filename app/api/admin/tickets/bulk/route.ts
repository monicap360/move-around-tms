import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type BulkBody = {
  action: "void" | "delete";
  ticketIds: string[];
};

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let body: BulkBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const { action, ticketIds } = body;
  if (!action || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  try {
    if (action === "void") {
      const { data, error } = await supabaseAdmin
        .from("aggregate_tickets")
        .update({
          voided: true,
          voided_at: new Date().toISOString(),
          status: "Voided",
        })
        .in("id", ticketIds)
        .select("id");
      if (error) throw error;
      return NextResponse.json({ ok: true, updated: data?.length || 0 });
    }

    if (action === "delete") {
      const { data, error } = await supabaseAdmin
        .from("aggregate_tickets")
        .delete()
        .in("id", ticketIds)
        .select("id");
      if (error) throw error;
      return NextResponse.json({ ok: true, deleted: data?.length || 0 });
    }

    return NextResponse.json(
      { ok: false, error: "invalid_action" },
      { status: 400 },
    );
  } catch (e: any) {
    console.error("bulk tickets error", e);
    return NextResponse.json(
      { ok: false, error: "bulk_failed" },
      { status: 500 },
    );
  }
}
