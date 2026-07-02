import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendMoveAroundEmail, moveAroundEmailConfigured, MOVEAROUND_FROM } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Public "Request a Demo" capture for MoveAround (the product company).
// PRIMARY capture is IN-APP: saved to trial_signups (HQ → Signups & Trials).
// Email always goes through the MoveAround identity (support@movearoundtms.com),
// NEVER through Ronyx's mailbox — see lib/mailer sendMoveAroundEmail.
const NOTIFY = () => process.env.DEMO_NOTIFY_EMAIL || MOVEAROUND_FROM;

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const company = String(b.company || "").trim();
  const phone = String(b.phone || "").trim();
  const product = String(b.product || "").trim();
  const fleet = String(b.fleet_size || "").trim();
  const message = String(b.message || "").trim();

  if (!name || !email) return NextResponse.json({ ok: false, error: "Name and email are required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, error: "That email doesn't look right." }, { status: 400 });

  const referral = ["Demo request", product && `Product: ${product}`, message && `“${message}”`].filter(Boolean).join(" · ");

  const { error } = await supabaseAdmin.from("trial_signups").insert({
    name, email, company: company || null, phone: phone || null,
    fleet_size: fleet || null, role: product ? `Demo · ${product}` : "Demo request",
    referral, status: "demo",
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Email notifications are OPT-IN and MoveAround-only. If a dedicated MoveAround
  // inbox/identity isn't configured, we do NOT touch Ronyx's mailbox — the request
  // is still fully captured in HQ → Signups & Trials.
  let notified = false;
  if (moveAroundEmailConfigured()) {
    const summary = `New demo request${product ? ` for ${product}` : ""}:

Name:    ${name}
Company: ${company || "—"}
Email:   ${email}
Phone:   ${phone || "—"}
Fleet:   ${fleet || "—"}
Product: ${product || "—"}
Message: ${message || "—"}

Saved to HQ → Signups & Trials (status: demo).`;
    const mail = await sendMoveAroundEmail({
      to: NOTIFY(), replyTo: email,
      subject: `🚀 Demo request${product ? ` — ${product}` : ""}: ${name}${company ? ` (${company})` : ""}`,
      text: summary,
    }).catch(() => ({ ok: false }));
    notified = (mail as any)?.ok || false;
    // Confirmation to the requester, from the MoveAround identity.
    await sendMoveAroundEmail({
      to: email,
      subject: "We got your MoveAround demo request",
      text: `Hi ${name.split(" ")[0]},\n\nThanks for requesting a demo${product ? ` of ${product}` : ""}! Our team will reach out shortly to set up a time.\n\n— The MoveAround TMS Team`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, notified });
}
