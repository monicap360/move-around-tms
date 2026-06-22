import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sylviaypena@yahoo.com";

function makeTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function POST(req: Request, props: { params: Promise<{ driver_id: string }> }) {
  const params = await props.params;
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  // Load driver + profile
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, name, driver_profiles(full_name, email, phone, medical_card_expiration, license_expiration_date, mvr_expiration)")
    .eq("id", params.driver_id)
    .single();

  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const profile   = Array.isArray(driver.driver_profiles) ? driver.driver_profiles[0] : driver.driver_profiles;
  const driverName  = profile?.full_name || driver.name || "Driver";
  const driverEmail = profile?.email     || body.email  || null;
  const today       = new Date().toISOString().slice(0, 10);

  // Build list of expired/expiring docs
  const issues: string[] = [];
  const checks = [
    { label: "Medical Card",   date: profile?.medical_card_expiration },
    { label: "CDL",            date: profile?.license_expiration_date },
    { label: "MVR",            date: profile?.mvr_expiration },
  ];

  for (const c of checks) {
    if (!c.date) continue;
    if (c.date < today) {
      issues.push(`• ${c.label}: EXPIRED on ${c.date}`);
    } else {
      const days = Math.ceil((new Date(c.date).getTime() - Date.now()) / 86400000);
      if (days <= 30) issues.push(`• ${c.label}: expires in ${days} day(s) (${c.date})`);
    }
  }

  if (issues.length === 0) {
    return NextResponse.json({ message: "No expired or expiring docs found — no reminder sent" });
  }

  const transport = makeTransport();
  const sent: string[] = [];

  // Email to driver
  if (driverEmail) {
    await transport.sendMail({
      from:    `"MoveAround TMS" <${process.env.GMAIL_USER}>`,
      to:      driverEmail,
      subject: "Action Required: Compliance Documents Need Attention",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#0f172a">Compliance Action Required</h2>
          <p>Hi ${driverName},</p>
          <p>The following compliance document(s) require your immediate attention:</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
            ${issues.map(i => `<p style="color:#991b1b;margin:4px 0">${i}</p>`).join("")}
          </div>
          <p>Please upload your updated documents as soon as possible to avoid dispatch delays.</p>
          <p style="color:#64748b;font-size:12px">MoveAround TMS — Compliance System</p>
        </div>
      `,
    });
    sent.push(driverEmail);
  }

  // Admin notification
  await transport.sendMail({
    from:    `"MoveAround TMS Compliance" <${process.env.GMAIL_USER}>`,
    to:      ADMIN_EMAIL,
    subject: `⚠️ Compliance Alert: ${driverName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#dc2626">Compliance Alert — ${driverName}</h2>
        <p>The following compliance issue(s) were detected:</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
          ${issues.map(i => `<p style="color:#991b1b;margin:4px 0">${i}</p>`).join("")}
        </div>
        <p><strong>Driver:</strong> ${driverName}</p>
        <p><strong>Email:</strong> ${driverEmail || "No email on file"}</p>
        <p><strong>Phone:</strong> ${profile?.phone || "No phone on file"}</p>
        <p>This driver has been flagged as dispatch-ineligible until documents are updated and reviewed.</p>
        <p style="color:#64748b;font-size:12px">Sent by MoveAround TMS Compliance System</p>
      </div>
    `,
  });
  sent.push(ADMIN_EMAIL);

  return NextResponse.json({
    sent_to:     sent,
    issues_found: issues.length,
    driver:      driverName,
  });
}
