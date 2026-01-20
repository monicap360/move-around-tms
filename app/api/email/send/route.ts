import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST: Send email via Supabase Edge Function (send-email)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, from } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: "Missing to, subject, and message content" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.functions.invoke("send-email", {
      body: { to, subject, text, html, from },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, response: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/security";
import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
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
  if (!requireSameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
