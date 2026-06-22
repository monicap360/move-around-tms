import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const ORG_FILTER = process.env.RONYX_ORG_ID
  ? `id.eq.${process.env.RONYX_ORG_ID},organization_code.eq.RONYX`
  : `organization_code.eq.RONYX`;

async function resolveOrgId(supabase: typeof supabaseAdmin) {
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .or(ORG_FILTER)
    .limit(1)
    .single();
  return data?.id as string | null;
}

export async function GET(request: NextRequest) {
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId(supabase);
  if (!orgId) return NextResponse.json({ queue: [] });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const { data, error } = await supabase
    .from("ronyx_billing_queue")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", status)
    .order("queued_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ queue: data ?? [] });
}

// PATCH: mark queue items as invoiced when an invoice is created
export async function PATCH(request: NextRequest) {
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  let body: { ids?: string[]; invoice_id?: string; status?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { ids, invoice_id, status = "invoiced" } = body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("ronyx_billing_queue")
    .update({
      status,
      invoice_id:   invoice_id ?? null,
      processed_at: new Date().toISOString(),
    })
    .in("id", ids)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, updated: ids.length });
}
