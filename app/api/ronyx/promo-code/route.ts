import { NextResponse } from "next/server";
import { requireOrgRole } from "@/lib/auth/requireOrgRole";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["owner", "super_admin", "admin"];

// Valid promo codes → trial duration in days
const PROMO_CODES: Record<string, number> = {
  RONYX30: 30,
};

export async function POST(req: Request) {
  const auth = await requireOrgRole(ALLOWED_ROLES);
  if (!auth.ok) return auth.response;

  const { supabase, organization } = auth;

  let body: { promoCode?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }

  const promoCode = String(body?.promoCode ?? "").trim().toUpperCase();

  const trialDays = PROMO_CODES[promoCode];
  if (!trialDays) {
    return NextResponse.json(
      { ok: false, error: "Invalid promo code." },
      { status: 400 }
    );
  }

  const isRonyx =
    String(organization.name ?? "").toLowerCase().includes("ronyx") ||
    String(organization.organization_code ?? "").toLowerCase().includes("ronyx");

  if (!isRonyx) {
    return NextResponse.json(
      { ok: false, error: "This promo code is not valid for this organization." },
      { status: 403 }
    );
  }

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const { error } = await supabase
    .from("organizations")
    .update({
      status:                "active",
      account_type:          "free_trial",
      subscription_status:   "trial_active",
      bypass_subscription:   true,
      subscription_required: false,
      pilot_started_at:      now.toISOString(),
      pilot_ends_at:         trialEndsAt.toISOString(),
      pilot_notes:           `${trialDays}-day free trial activated by promo code ${promoCode}.`,
    })
    .eq("id", organization.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: `${trialDays}-day free trial activated.`,
    trialStartedAt: now.toISOString(),
    trialEndsAt:    trialEndsAt.toISOString(),
  });
}
