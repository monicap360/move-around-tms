import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendMoveAroundEmail, moveAroundEmailConfigured, MOVEAROUND_FROM } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// Public "Contact Support" capture. Saves to support_tickets (shown in HQ →
// Support). Notifies support@movearoundtms.com — but only via the MoveAround
// mail identity, never through Ronyx. If that isn't set up, it stays in-app.
const NOTIFY = () => process.env.SUPPORT_NOTIFY_EMAIL || process.env.DEMO_NOTIFY_EMAIL || MOVEAROUND_FROM;

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const subject = String(b.subject || "").trim();
  const message = String(b.message || "").trim();
  const company = String(b.company || "").trim();
  const category = String(b.category || "concern").trim();

  if (!email || !message) return NextResponse.json({ ok: false, error: "Email and a message are required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, error: "That email doesn't look right." }, { status: 400 });

  const { error } = await supabaseAdmin.from("support_tickets").insert({
    name: name || null, email, company: company || null,
    subject: subject || "(no subject)", message, category, status: "open",
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let notified = false;
  if (moveAroundEmailConfigured()) {
    const mail = await sendMoveAroundEmail({
      to: NOTIFY(), replyTo: email,
      subject: `🎫 Support: ${subject || "(no subject)"} — ${name || email}`,
      text: `New support ticket:\n\nName: ${name || "—"}\nCompany: ${company || "—"}\nEmail: ${email}\nCategory: ${category}\nSubject: ${subject || "—"}\n\n${message}\n\nSaved to HQ → Support.`,
    }).catch(() => ({ ok: false }));
    notified = (mail as any)?.ok || false;
  }
  return NextResponse.json({ ok: true, notified });
}
