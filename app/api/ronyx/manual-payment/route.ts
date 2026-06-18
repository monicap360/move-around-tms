import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ── Resolve org ───────────────────────────────────────────────────────────────
async function resolveRonyxOrg(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const envOrgId = process.env.RONYX_ORG_ID;
  const orFilter = envOrgId
    ? `id.eq.${envOrgId},organization_code.eq.RONYX`
    : `organization_code.eq.RONYX`;

  const { data } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status, manual_payment_status, manual_payment_method, manual_payment_reference, manual_payment_amount, manual_payment_notes, manual_payment_submitted_at, manual_payment_confirmed_at")
    .or(orFilter)
    .limit(1)
    .single();

  return data as Record<string, unknown> | null;
}

// ── GET — current payment status + log ───────────────────────────────────────
export async function GET() {
  const supabase = createSupabaseServerClient();
  const org = await resolveRonyxOrg(supabase);
  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const { data: logs } = await supabase
    .from("manual_payment_logs")
    .select("*")
    .eq("organization_id", org.id as string)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    org_id:                     org.id,
    manual_payment_status:      org.manual_payment_status ?? "not_required",
    manual_payment_method:      org.manual_payment_method ?? null,
    manual_payment_reference:   org.manual_payment_reference ?? null,
    manual_payment_amount:      org.manual_payment_amount ?? null,
    manual_payment_notes:       org.manual_payment_notes ?? null,
    manual_payment_submitted_at: org.manual_payment_submitted_at ?? null,
    manual_payment_confirmed_at: org.manual_payment_confirmed_at ?? null,
    logs: logs ?? [],
  });
}

// ── POST — submit or verify ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const org = await resolveRonyxOrg(supabase);
  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const action = body.action as string;

  // ── Customer: submit payment ──────────────────────────────────────────────
  if (action === "submit") {
    const method    = body.method as string;
    const amount    = body.amount ? Number(body.amount) : null;
    const reference = body.reference as string | undefined;
    const notes     = body.notes as string | undefined;

    const VALID_METHODS = ["zelle", "cash_app", "cash", "check", "wire", "other"];
    if (!method || !VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { error: orgErr } = await supabase
      .from("organizations")
      .update({
        manual_payment_status:      "payment_submitted",
        manual_payment_method:      method,
        manual_payment_reference:   reference ?? null,
        manual_payment_amount:      amount,
        manual_payment_notes:       notes ?? null,
        manual_payment_submitted_at: now,
      })
      .eq("id", org.id as string);

    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

    // Log the submission
    await supabase.from("manual_payment_logs").insert({
      organization_id: org.id,
      payment_method:  method,
      amount,
      reference:       reference ?? null,
      notes:           notes ?? null,
      status:          "payment_submitted",
      submitted_at:    now,
    });

    return NextResponse.json({ success: true, manual_payment_status: "payment_submitted" });
  }

  // ── Admin: verify payment ─────────────────────────────────────────────────
  if (action === "verify") {
    const now = new Date().toISOString();

    const { error: orgErr } = await supabase
      .from("organizations")
      .update({
        manual_payment_status:      "payment_verified",
        manual_payment_confirmed_at: now,
      })
      .eq("id", org.id as string);

    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

    // Update latest submitted log to verified
    const { data: latestLog } = await supabase
      .from("manual_payment_logs")
      .select("id")
      .eq("organization_id", org.id as string)
      .eq("status", "payment_submitted")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (latestLog) {
      await supabase
        .from("manual_payment_logs")
        .update({ status: "payment_verified", verified_at: now })
        .eq("id", (latestLog as Record<string, unknown>).id as string);
    }

    return NextResponse.json({ success: true, manual_payment_status: "payment_verified" });
  }

  // ── Admin: reject payment ─────────────────────────────────────────────────
  if (action === "reject") {
    const { error: orgErr } = await supabase
      .from("organizations")
      .update({ manual_payment_status: "payment_rejected" })
      .eq("id", org.id as string);

    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

    await supabase
      .from("manual_payment_logs")
      .update({ status: "payment_rejected" })
      .eq("organization_id", org.id as string)
      .eq("status", "payment_submitted");

    return NextResponse.json({ success: true, manual_payment_status: "payment_rejected" });
  }

  // ── Admin: reset to pending ───────────────────────────────────────────────
  if (action === "reset") {
    await supabase
      .from("organizations")
      .update({ manual_payment_status: "pending_manual_payment" })
      .eq("id", org.id as string);
    return NextResponse.json({ success: true, manual_payment_status: "pending_manual_payment" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
