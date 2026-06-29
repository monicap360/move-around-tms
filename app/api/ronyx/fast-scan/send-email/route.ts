import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { TMS_BUCKET } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { document_id, to, subject, message, filename } = body;

  if (!to || !document_id) {
    return NextResponse.json({ error: "Missing to or document_id" }, { status: 400 });
  }

  const sb = adminClient();

  const { data: doc } = await sb
    .from("fast_scan_documents")
    .select("object_path, original_filename, ticket_number, truck_number, driver_name")
    .eq("id", document_id)
    .single();

  let attachment: { filename: string; content: Buffer; contentType: string } | undefined;

  if (doc?.object_path) {
    try {
      const { data: signed } = await sb.storage.from(TMS_BUCKET).createSignedUrl(doc.object_path, 300);
      if (signed?.signedUrl) {
        const resp = await fetch(signed.signedUrl);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          const ct = resp.headers.get("content-type") || "application/pdf";
          attachment = {
            filename: filename || doc.original_filename || "ticket.pdf",
            content: buf,
            contentType: ct,
          };
        }
      }
    } catch { /* send without attachment */ }
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    await sb.from("ticket_audit_log").insert({
      action: "fast_scan_email_queued",
      description: `Fast Scan email queued (SMTP not configured) — doc ${document_id} to ${to}`,
      metadata: { to, document_id },
    }).maybeSingle();
    return NextResponse.json({ ok: false, queued: true, message: "Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD." });
  }

  const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  const emailSubject = subject || `Ticket Scan — ${doc?.ticket_number || "MoveAround TMS"}`;
  const emailText = message || `Please find the attached ticket scan.\n\nTruck: ${doc?.truck_number || "N/A"}\nDriver: ${doc?.driver_name || "N/A"}\n\n— MoveAround TMS / Ronyx Logistics`;
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
      <div style="background:#0f172a;padding:18px 22px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:17px;">MoveAround TMS</h2>
        <p style="color:#94a3b8;margin:3px 0 0;font-size:12px;">Fast Scan™ — Ticket Delivery</p>
      </div>
      <div style="background:#f8fafc;padding:22px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
        <p style="color:#475569;line-height:1.6;font-size:13px;">${emailText.replace(/\n/g, "<br>")}</p>
        ${attachment ? `<p style="color:#64748b;font-size:12px;margin-top:16px;">📎 <strong>${attachment.filename}</strong> is attached to this email.</p>` : ""}
        <p style="color:#94a3b8;font-size:11px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px;">Sent via MoveAround TMS — Fast Scan™</p>
      </div>
    </div>
  `;

  try {
    await transport.sendMail({
      from: `"MoveAround TMS" <${user}>`,
      to,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      attachments: attachment ? [attachment] : [],
    });
  } catch (e: any) {
    // Most common cause: invalid/expired Gmail App Password (SMTP 535 BadCredentials).
    const msg = String(e?.message || e || "unknown");
    await sb.from("ticket_audit_log").insert({
      action: "fast_scan_email_failed",
      description: `Fast Scan email FAILED to ${to} — doc ${document_id}: ${msg.slice(0, 160)}`,
      metadata: { to, document_id, error: msg.slice(0, 200) },
    }).maybeSingle();
    return NextResponse.json({
      ok: false,
      error: `Email failed to send. ${/535|BadCredentials|Invalid login/i.test(msg) ? "The Gmail App Password is invalid — generate a 16-character App Password (Google account → Security → App passwords) and set GMAIL_APP_PASSWORD." : msg}`,
    }, { status: 200 });
  }

  await sb.from("ticket_audit_log").insert({
    action: "fast_scan_email_sent",
    description: `Fast Scan ticket emailed to ${to} — doc ${document_id}`,
    metadata: { to, document_id, ticket_number: doc?.ticket_number },
  }).maybeSingle();

  return NextResponse.json({ ok: true, sentTo: to });
}
