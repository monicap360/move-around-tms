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

// Two separate identities so brands never mix:
//   "ronyx"      → the tenant's Proton (SMTP_*), from admin@ronyxlogistics.com
//   "movearound" → the product company, from support@movearoundtms.com, sent via
//                  its OWN creds (MOVEAROUND_SMTP_*). If those aren't set we DO NOT
//                  fall back to Ronyx — MoveAround mail simply stays unsent (capture
//                  is still in-app). Set MOVEAROUND_SMTP_HOST/PORT/USER/PASS +
//                  MOVEAROUND_MAIL_FROM (default support@movearoundtms.com) to enable.
export const MOVEAROUND_FROM = process.env.MOVEAROUND_MAIL_FROM || "support@movearoundtms.com";
type Channel = "ronyx" | "movearound";

function creds(channel: Channel) {
  if (channel === "movearound") {
    return {
      host: process.env.MOVEAROUND_SMTP_HOST || "",
      port: process.env.MOVEAROUND_SMTP_PORT ? Number(process.env.MOVEAROUND_SMTP_PORT) : 587,
      user: process.env.MOVEAROUND_SMTP_USER || "",
      pass: process.env.MOVEAROUND_SMTP_PASS || "",
      from: MOVEAROUND_FROM,
    };
  }
  return {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: DEFAULT_FROM,
  };
}

function channelConfigured(channel: Channel): boolean {
  const c = creds(channel);
  return !!(c.host && c.user && c.pass && !PLACEHOLDER.test(c.host) && !PLACEHOLDER.test(c.user) && !PLACEHOLDER.test(c.pass));
}

export function emailConfigured(): boolean { return channelConfigured("ronyx"); }
export function moveAroundEmailConfigured(): boolean { return channelConfigured("movearound"); }

export type SendResult = { ok: boolean; id?: string; simulated?: boolean; error?: string };

export async function sendEmail(opts: { to: string; subject: string; text?: string; html?: string; from?: string; replyTo?: string; channel?: Channel }): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: "No recipient address" };
  const channel: Channel = opts.channel || "ronyx";
  if (!channelConfigured(channel)) {
    return { ok: false, simulated: true, error: channel === "movearound"
      ? "MoveAround email isn't configured yet — set MOVEAROUND_SMTP_HOST / USER / PASS + MOVEAROUND_MAIL_FROM."
      : "Email isn't configured yet — set SMTP_HOST / SMTP_USER / SMTP_PASS (Proton)." };
  }
  const c = creds(channel);
  try {
    const transporter = nodemailer.createTransport({
      host: c.host, port: c.port, secure: c.port === 465,
      auth: { user: c.user, pass: c.pass },
    });
    const info = await transporter.sendMail({
      from: opts.from || c.from,
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

// Always sends as MoveAround (support@movearoundtms.com) via MoveAround's own creds.
export async function sendMoveAroundEmail(opts: { to: string; subject: string; text?: string; html?: string; replyTo?: string }): Promise<SendResult> {
  return sendEmail({ ...opts, channel: "movearound" });
}
