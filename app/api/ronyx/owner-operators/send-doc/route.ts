import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { to, subject, message, doc_type, file_url, file_name, oo_name } = body;

  if (!to || !file_url) {
    return NextResponse.json({ error: "Missing to or file_url" }, { status: 400 });
  }

  const sb = createSupabaseServerClient();

  // Get a short-lived signed URL so we can fetch the file bytes
  let downloadUrl = file_url;
  try {
    // Parse bucket and path from the stored URL pattern
    const match = file_url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)/);
    if (match) {
      const [, bucket, path] = match;
      const { data } = await sb.storage.from(bucket).createSignedUrl(path, 300);
      if (data?.signedUrl) downloadUrl = data.signedUrl;
    }
  } catch {
    // fall through — use the original URL
  }

  // Download the file to attach it
  let attachment: { filename: string; content: Buffer; contentType: string } | undefined;
  try {
    const resp = await fetch(downloadUrl);
    if (resp.ok) {
      const buf = Buffer.from(await resp.arrayBuffer());
      const ct  = resp.headers.get("content-type") || "application/octet-stream";
      attachment = { filename: file_name || doc_type || "document.pdf", content: buf, contentType: ct };
    }
  } catch {
    // send without attachment if download fails
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    await sb.from("ticket_audit_log").insert({
      action:      "oo_doc_email_queued",
      description: `OO doc email queued (SMTP not configured) — ${doc_type} to ${to}`,
      metadata:    { to, doc_type, oo_name },
    }).maybeSingle();
    return NextResponse.json({ ok: false, queued: true, message: "Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD." });
  }

  const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

  const emailSubject = subject || `${doc_type || "Document"} — ${oo_name || "Owner Operator"}`;
  const emailText    = message || `Please find the attached ${doc_type || "document"} for ${oo_name || "your company"}.\n\n— MoveAround TMS / Ronyx Logistics`;
  const emailHtml    = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
      <div style="background:#0f172a;padding:18px 22px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:17px;">MoveAround TMS</h2>
        <p style="color:#94a3b8;margin:3px 0 0;font-size:12px;">Ronyx Logistics — Document Delivery</p>
      </div>
      <div style="background:#f8fafc;padding:22px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <h3 style="margin:0 0 10px;color:#0f172a;font-size:15px;">${doc_type || "Document"}</h3>
        <p style="color:#475569;line-height:1.6;font-size:13px;">${emailText.replace(/\n/g, "<br>")}</p>
        ${attachment ? `<p style="color:#64748b;font-size:12px;margin-top:16px;">📎 <strong>${attachment.filename}</strong> is attached to this email.</p>` : ""}
        <p style="color:#94a3b8;font-size:11px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px;">Sent via MoveAround TMS — Ronyx Owner Operator Portal</p>
      </div>
    </div>
  `;

  try {
    await transport.sendMail({
      from:        `"MoveAround TMS" <${user}>`,
      to,
      subject:     emailSubject,
      text:        emailText,
      html:        emailHtml,
      attachments: attachment ? [attachment] : [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  await sb.from("ticket_audit_log").insert({
    action:      "oo_doc_email_sent",
    description: `OO doc emailed — ${doc_type} sent to ${to} for ${oo_name}`,
    metadata:    { to, doc_type, oo_name, file_name },
  }).maybeSingle();

  return NextResponse.json({ ok: true, sentTo: to });
}
