import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const PLATFORM_EMAIL = "cruisesfromgalveston.texas@gmail.com";

const PRIORITY_LABELS: Record<string, string> = {
  low:    "🟢 Low",
  normal: "🟡 Normal",
  urgent: "🔴 Urgent",
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host, port, secure: port === 465, auth: { user, pass },
  });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const {
    page_or_feature = "Not specified",
    description,
    priority = "normal",
    contact_name,
    contact_email,
    org_name,
    org_slug,
    organization_id,
  } = body;

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const safeOrgName   = (org_name || "Unknown Company").slice(0, 100);
  const safeOrgSlug   = (org_slug || "").slice(0, 50);
  const safeFeature   = page_or_feature.slice(0, 200);
  const safeDesc      = description.trim().slice(0, 2000);
  const safePriority  = ["low", "normal", "urgent"].includes(priority) ? priority : "normal";
  const safeName      = (contact_name || "").slice(0, 100);
  const safeEmail     = (contact_email || "").slice(0, 200);

  // 1. Save to database
  const { data: saved, error: dbError } = await supabase
    .from("platform_customization_requests")
    .insert({
      organization_id: organization_id || null,
      org_name:        safeOrgName,
      org_slug:        safeOrgSlug,
      page_or_feature: safeFeature,
      description:     safeDesc,
      priority:        safePriority,
      contact_name:    safeName || null,
      contact_email:   safeEmail || null,
      status:          "new",
    })
    .select("id, created_at")
    .single();

  if (dbError) {
    console.error("Customization request DB error:", dbError.message);
    // Don't block the user — still try to send email
  }

  const requestId = saved?.id?.slice(0, 8).toUpperCase() ?? "N/A";
  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  // 2. Send email notification
  const html = `
<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:24px 28px;">
    <div style="color:#fff;font-size:1.2rem;font-weight:800;">🔧 New Customization Request</div>
    <div style="color:#bfdbfe;font-size:0.85rem;margin-top:4px;">MoveAround TMS Platform</div>
  </div>
  <div style="padding:24px 28px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;width:140px;">REQUEST ID</td><td style="padding:8px 0;color:#0f172a;font-weight:700;">#${requestId}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;">COMPANY</td><td style="padding:8px 0;color:#0f172a;">${safeOrgName}${safeOrgSlug ? ` (${safeOrgSlug}.movearoundtms.app)` : ""}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;">PRIORITY</td><td style="padding:8px 0;">${PRIORITY_LABELS[safePriority] ?? safePriority}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;">PAGE / FEATURE</td><td style="padding:8px 0;color:#0f172a;">${safeFeature}</td></tr>
      ${safeName  ? `<tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;">CONTACT</td><td style="padding:8px 0;color:#0f172a;">${safeName}</td></tr>` : ""}
      ${safeEmail ? `<tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;">EMAIL</td><td style="padding:8px 0;color:#1d4ed8;">${safeEmail}</td></tr>` : ""}
      <tr><td style="padding:8px 0;color:#64748b;font-size:0.8rem;font-weight:700;">SUBMITTED</td><td style="padding:8px 0;color:#64748b;">${submittedAt} CT</td></tr>
    </table>
    <div style="margin-top:20px;">
      <div style="color:#64748b;font-size:0.8rem;font-weight:700;margin-bottom:8px;">WHAT THEY WANT</div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;color:#0f172a;font-size:0.9rem;line-height:1.6;white-space:pre-wrap;">${safeDesc}</div>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:0.75rem;">
      View all requests in the Platform Admin Console → admin.movearoundtms.app/platform
    </div>
  </div>
</div>
  `.trim();

  try {
    const transporter = getTransport();
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "noreply@movearoundtms.app",
      to:   PLATFORM_EMAIL,
      subject: `[${PRIORITY_LABELS[safePriority] ?? safePriority}] Customization Request from ${safeOrgName} — ${safeFeature}`,
      html,
      text: `New customization request from ${safeOrgName}\nFeature: ${safeFeature}\nPriority: ${safePriority}\n\n${safeDesc}\n\nContact: ${safeName} ${safeEmail}`,
    });
  } catch (emailErr) {
    console.error("Customization request email failed:", emailErr);
    // Non-fatal — still return success if DB save worked
  }

  return NextResponse.json({
    ok:         true,
    request_id: requestId,
    message:    "Your request has been submitted. We'll review it and follow up shortly.",
  });
}

// GET: list requests for the admin console
export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("platform_customization_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}
