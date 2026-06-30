import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { sendEmail, emailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

// GET → is email configured?  POST {to} → send a test email to verify the Proton token.
export async function GET() {
  return NextResponse.json({ configured: emailConfigured(), from: process.env.MAIL_FROM || process.env.SMTP_USER || null, host: process.env.SMTP_HOST || null });
}

export async function POST(req: NextRequest) {
  try {
    await resolveOrgId();
    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return NextResponse.json({ error: "Provide a 'to' address" }, { status: 400 });
    const r = await sendEmail({
      to,
      subject: "MoveAround TMS — email is working ✅",
      text: "This is a test from your MoveAround TMS Accounting Command Center. If you can read this, Proton SMTP is set up correctly.",
      html: `<div style="font-family:Inter,system-ui,sans-serif"><p>✅ <strong>Email is working.</strong></p><p>This test came from your MoveAround TMS Accounting Command Center via Proton SMTP, sending as <strong>${process.env.MAIL_FROM || process.env.SMTP_USER}</strong>.</p></div>`,
    });
    if (!r.ok) return NextResponse.json({ ok: false, simulated: r.simulated, error: r.error }, { status: r.simulated ? 200 : 500 });
    return NextResponse.json({ ok: true, to, id: r.id });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
