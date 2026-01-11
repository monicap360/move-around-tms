// Email Send API
// Send quote emails to customers or management

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to, subject, body_text, body_html, from } = body;

  if (!to || !subject || (!body_text && !body_html)) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, body_text or body_html" },
      { status: 400 },
    );
  }

  // Configure email transport
  // Option 1: Use SMTP (Gmail, Outlook, custom SMTP)
  // Option 2: Use SendGrid API (set SENDGRID_API_KEY)
  // Option 3: Use AWS SES, Mailgun, etc.

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT)
    : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom =
    from || process.env.EMAIL_FROM || "noreply@ronyxlogistics.com";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json(
      {
        error:
          "Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.",
        draft_mode: true,
        message:
          "Email draft generated but not sent. Configure SMTP to enable sending.",
      },
      { status: 200 },
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      text: body_text,
      html: body_html || body_text,
    });

    return NextResponse.json({
      success: true,
      message_id: info.messageId,
      sent_to: to,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
