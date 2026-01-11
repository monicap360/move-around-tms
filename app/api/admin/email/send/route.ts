import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
function authorize(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${ADMIN_TOKEN}`;
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    // Fallback transport: stream to console
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function POST(req: NextRequest) {
  if (!authorize(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { to, subject, text, html, from } = body || {};
  if (!to || !subject || (!text && !html)) {
    return NextResponse.json(
      { error: "Missing to, subject, or content" },
      { status: 400 },
    );
  }
  const transporter = getTransport();
  const mailFrom = from || process.env.MAIL_FROM || "quotes@ronyxlogistics.com";
  try {
    const info = await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      html,
    });
    return NextResponse.json({ ok: true, info });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
