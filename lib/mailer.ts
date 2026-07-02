import nodemailer from "nodemailer";

// Shared mailer for the app. Sends via SMTP using SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
// Configured for Proton Mail SMTP submission:
//   SMTP_HOST=smtp.protonmail.ch
//   SMTP_PORT=587            (STARTTLS; use 465 for SSL)
//   SMTP_USER=admin@ronyxlogistics.com
//   SMTP_PASS=<Proton SMTP token>      (generated in Proton → Settings → IMAP/SMTP)
//   MAIL_FROM=admin@ronyxlogistics.com
// The "from" must be a Proton address or a verified alias on your custom domain.

const DEFAULT_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || "admin@ronyxlogistics.com";
const PLACEHOLDER = /your-|placeholder|REPLACE|example\.com|changeme/i;

export function emailConfigured(): boolean {
  const h = process.env.SMTP_HOST || "";
  const u = process.env.SMTP_USER || "";
  const p = process.env.SMTP_PASS || "";
  return !!(h && u && p && !PLACEHOLDER.test(h) && !PLACEHOLDER.test(u) && !PLACEHOLDER.test(p));
}

export type SendResult = { ok: boolean; id?: string; simulated?: boolean; error?: string };

export async function sendEmail(opts: { to: string; subject: string; text?: string; html?: string; from?: string; replyTo?: string }): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: "No recipient address" };
  if (!emailConfigured()) {
    return { ok: false, simulated: true, error: "Email isn't configured yet — set SMTP_HOST / SMTP_USER / SMTP_PASS (Proton)." };
  }
  try {
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: opts.from || DEFAULT_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    return { ok: true, id: info.messageId };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Send failed" };
  }
}
